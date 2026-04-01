extern "C" {

static inline float clampf(float value, float min_value, float max_value) {
  return value < min_value ? min_value : (value > max_value ? max_value : value);
}

static inline float absf(float value) {
  return value < 0.0f ? -value : value;
}

static inline float triangle_wave(float value) {
  const float fractional = value - __builtin_floorf(value);
  return absf(fractional * 2.0f - 1.0f);
}

static inline float terrain_height(float x, float z, float phase, float amplitude, float roughness) {
  const float ridge_a =
      1.0f - triangle_wave(x * 0.34f + phase * 0.11f +
                           triangle_wave(z * 0.16f + phase * 0.07f + 0.35f) * (0.28f + roughness * 0.1f));
  const float ridge_b =
      1.0f - triangle_wave(z * (0.37f + roughness * 0.04f) - phase * 0.09f +
                           triangle_wave((x - z) * 0.12f + 0.9f) * (0.24f + roughness * 0.08f));
  const float shelves =
      1.0f - triangle_wave((x + z) * (0.19f + roughness * 0.03f) + phase * 0.05f + ridge_a * 0.18f);
  const float basin = (x * x + z * z) * 0.018f;
  const float terrace_steps = 5.0f + roughness * 8.0f;
  const float base = ridge_a * 0.54f + ridge_b * 0.32f + shelves * 0.24f;
  const float terraced = __builtin_floorf(base * terrace_steps) / terrace_steps;

  return (terraced * (0.95f + roughness * 0.42f) - basin) * amplitude;
}

__attribute__((export_name("build_terrain_mesh"))) void build_terrain_mesh(
    unsigned int position_ptr,
    unsigned int normal_ptr,
    unsigned int color_ptr,
    unsigned int index_ptr,
    unsigned int resolution,
    float phase,
    float amplitude,
    float roughness) {
  float* positions = reinterpret_cast<float*>(position_ptr);
  float* normals = reinterpret_cast<float*>(normal_ptr);
  float* colors = reinterpret_cast<float*>(color_ptr);
  unsigned int* indices = reinterpret_cast<unsigned int*>(index_ptr);

  const unsigned int span = resolution + 1;
  const float world_size = 8.4f;
  const float world_half = world_size * 0.5f;
  const float cell_size = world_size / static_cast<float>(resolution);

  for (unsigned int z = 0; z <= resolution; z += 1) {
    for (unsigned int x = 0; x <= resolution; x += 1) {
      const unsigned int vertex_index = z * span + x;
      const unsigned int offset = vertex_index * 3;
      const float world_x = static_cast<float>(x) * cell_size - world_half;
      const float world_z = static_cast<float>(z) * cell_size - world_half;

      const float height = terrain_height(world_x, world_z, phase, amplitude, roughness);
      const float height_l = terrain_height(world_x - cell_size, world_z, phase, amplitude, roughness);
      const float height_r = terrain_height(world_x + cell_size, world_z, phase, amplitude, roughness);
      const float height_d = terrain_height(world_x, world_z - cell_size, phase, amplitude, roughness);
      const float height_u = terrain_height(world_x, world_z + cell_size, phase, amplitude, roughness);

      float nx = height_l - height_r;
      float ny = cell_size * 2.0f;
      float nz = height_d - height_u;
      const float normal_length = __builtin_sqrtf(nx * nx + ny * ny + nz * nz);
      nx /= normal_length;
      ny /= normal_length;
      nz /= normal_length;

      const float slope = 1.0f - ny;
      const float height01 = clampf(0.5f + height / (amplitude * 2.35f > 0.001f ? amplitude * 2.35f : 0.001f), 0.0f, 1.0f);
      const float snow = clampf((height01 - 0.68f) * 2.2f + slope * 0.12f, 0.0f, 1.0f);

      positions[offset] = world_x;
      positions[offset + 1] = height;
      positions[offset + 2] = world_z;

      normals[offset] = nx;
      normals[offset + 1] = ny;
      normals[offset + 2] = nz;

      colors[offset] = clampf(0.12f + height01 * 0.22f + slope * 0.09f, 0.0f, 1.0f);
      colors[offset + 1] = clampf(0.22f + height01 * 0.44f - slope * 0.1f + snow * 0.08f, 0.0f, 1.0f);
      colors[offset + 2] = clampf(0.18f + height01 * 0.26f + slope * 0.14f + snow * 0.18f, 0.0f, 1.0f);
    }
  }

  unsigned int cursor = 0;
  for (unsigned int z = 0; z < resolution; z += 1) {
    for (unsigned int x = 0; x < resolution; x += 1) {
      const unsigned int a = z * span + x;
      const unsigned int b = a + 1;
      const unsigned int c = a + span;
      const unsigned int d = c + 1;

      indices[cursor] = a;
      indices[cursor + 1] = c;
      indices[cursor + 2] = b;
      indices[cursor + 3] = b;
      indices[cursor + 4] = c;
      indices[cursor + 5] = d;
      cursor += 6;
    }
  }
}

}
