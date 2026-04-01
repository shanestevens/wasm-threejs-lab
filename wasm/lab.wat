(module
  (memory (export "memory") 112)

  (func $abs_i32 (param $value i32) (result i32)
    (if (result i32)
      (i32.lt_s (local.get $value) (i32.const 0))
      (then
        (i32.sub (i32.const 0) (local.get $value))
      )
      (else
        (local.get $value)
      )
    )
  )

  (func $abs_f32 (param $value f32) (result f32)
    (if (result f32)
      (f32.lt (local.get $value) (f32.const 0.0))
      (then
        (f32.neg (local.get $value))
      )
      (else
        (local.get $value)
      )
    )
  )

  (func $clamp_i32 (param $value i32) (param $min i32) (param $max i32) (result i32)
    (if (result i32)
      (i32.lt_s (local.get $value) (local.get $min))
      (then
        (local.get $min)
      )
      (else
        (if (result i32)
          (i32.gt_s (local.get $value) (local.get $max))
          (then
            (local.get $max)
          )
          (else
            (local.get $value)
          )
        )
      )
    )
  )

  (func $grid_coord (param $value f32) (result i32)
    (call $clamp_i32
      (i32.trunc_f32_s
        (f32.mul
          (f32.add (local.get $value) (f32.const 7.0))
          (f32.const 4.5714288)
        )
      )
      (i32.const 0)
      (i32.const 63)
    )
  )

  (func $triangle_wave (param $value f32) (result f32)
    (call $abs_f32
      (f32.sub
        (f32.mul
          (f32.sub (local.get $value) (f32.floor (local.get $value)))
          (f32.const 2.0)
        )
        (f32.const 1.0)
      )
    )
  )

  (func $terrain_height
    (param $x f32)
    (param $z f32)
    (param $phase f32)
    (param $amplitude f32)
    (param $roughness f32)
    (result f32)
    (local $ridge_a f32)
    (local $ridge_b f32)
    (local $shelves f32)
    (local $basin f32)
    (local $terrace_steps f32)
    (local $base f32)
    (local $terraced f32)

    (local.set $ridge_a
      (f32.sub
        (f32.const 1.0)
        (call $triangle_wave
          (f32.add
            (f32.add
              (f32.mul (local.get $x) (f32.const 0.34))
              (f32.mul (local.get $phase) (f32.const 0.11))
            )
            (f32.mul
              (call $triangle_wave
                (f32.add
                  (f32.add
                    (f32.mul (local.get $z) (f32.const 0.16))
                    (f32.mul (local.get $phase) (f32.const 0.07))
                  )
                  (f32.const 0.35)
                )
              )
              (f32.add
                (f32.const 0.28)
                (f32.mul (local.get $roughness) (f32.const 0.1))
              )
            )
          )
        )
      )
    )

    (local.set $ridge_b
      (f32.sub
        (f32.const 1.0)
        (call $triangle_wave
          (f32.add
            (f32.sub
              (f32.mul
                (local.get $z)
                (f32.add
                  (f32.const 0.37)
                  (f32.mul (local.get $roughness) (f32.const 0.04))
                )
              )
              (f32.mul (local.get $phase) (f32.const 0.09))
            )
            (f32.mul
              (call $triangle_wave
                (f32.add
                  (f32.mul
                    (f32.sub (local.get $x) (local.get $z))
                    (f32.const 0.12)
                  )
                  (f32.const 0.9)
                )
              )
              (f32.add
                (f32.const 0.24)
                (f32.mul (local.get $roughness) (f32.const 0.08))
              )
            )
          )
        )
      )
    )

    (local.set $shelves
      (f32.sub
        (f32.const 1.0)
        (call $triangle_wave
          (f32.add
            (f32.add
              (f32.mul
                (f32.add (local.get $x) (local.get $z))
                (f32.add
                  (f32.const 0.19)
                  (f32.mul (local.get $roughness) (f32.const 0.03))
                )
              )
              (f32.mul (local.get $phase) (f32.const 0.05))
            )
            (f32.mul (local.get $ridge_a) (f32.const 0.18))
          )
        )
      )
    )

    (local.set $basin
      (f32.mul
        (f32.add
          (f32.mul (local.get $x) (local.get $x))
          (f32.mul (local.get $z) (local.get $z))
        )
        (f32.const 0.018)
      )
    )
    (local.set $terrace_steps
      (f32.add
        (f32.const 5.0)
        (f32.mul (local.get $roughness) (f32.const 8.0))
      )
    )
    (local.set $base
      (f32.add
        (f32.add
          (f32.mul (local.get $ridge_a) (f32.const 0.54))
          (f32.mul (local.get $ridge_b) (f32.const 0.32))
        )
        (f32.mul (local.get $shelves) (f32.const 0.24))
      )
    )
    (local.set $terraced
      (f32.div
        (f32.floor
          (f32.mul (local.get $base) (local.get $terrace_steps))
        )
        (local.get $terrace_steps)
      )
    )

    (f32.mul
      (f32.sub
        (f32.mul
          (local.get $terraced)
          (f32.add
            (f32.const 0.95)
            (f32.mul (local.get $roughness) (f32.const 0.42))
          )
        )
        (local.get $basin)
      )
      (local.get $amplitude)
    )
  )

  (func $store_vec3 (param $ptr i32) (param $x f32) (param $y f32) (param $z f32)
    (f32.store (local.get $ptr) (local.get $x))
    (f32.store offset=4 (local.get $ptr) (local.get $y))
    (f32.store offset=8 (local.get $ptr) (local.get $z))
  )

  (func $store_u32x3 (param $ptr i32) (param $a i32) (param $b i32) (param $c i32)
    (i32.store (local.get $ptr) (local.get $a))
    (i32.store offset=4 (local.get $ptr) (local.get $b))
    (i32.store offset=8 (local.get $ptr) (local.get $c))
  )

  (func (export "fill_triangle") (param $position_ptr i32) (param $color_ptr i32) (param $phase f32)
    (call $store_vec3
      (local.get $position_ptr)
      (f32.const -1.02)
      (f32.const -0.8)
      (f32.const 0.0)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 12))
      (f32.mul (local.get $phase) (f32.const 0.04))
      (f32.add (f32.const 0.9) (f32.mul (local.get $phase) (f32.const 0.08)))
      (f32.const 0.0)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 24))
      (f32.const 1.04)
      (f32.const -0.7)
      (f32.const 0.0)
    )

    (call $store_vec3
      (local.get $color_ptr)
      (f32.const 1.0)
      (f32.const 0.28)
      (f32.const 0.4)
    )
    (call $store_vec3
      (i32.add (local.get $color_ptr) (i32.const 12))
      (f32.const 0.26)
      (f32.const 0.52)
      (f32.const 1.0)
    )
    (call $store_vec3
      (i32.add (local.get $color_ptr) (i32.const 24))
      (f32.const 0.56)
      (f32.const 1.0)
      (f32.const 0.42)
    )
  )

  (func (export "fill_indexed_cube")
    (param $position_ptr i32)
    (param $color_ptr i32)
    (param $index_ptr i32)
    (param $profile f32)
    (local $half_bottom f32)
    (local $half_top f32)
    (local $height f32)

    (local.set $half_bottom (f32.const 0.82))
    (local.set $half_top
      (f32.sub
        (f32.const 0.82)
        (f32.mul (local.get $profile) (f32.const 0.16))
      )
    )
    (local.set $height
      (f32.add
        (f32.const 0.82)
        (f32.mul (local.get $profile) (f32.const 0.08))
      )
    )

    ;; Front face.
    (call $store_vec3
      (local.get $position_ptr)
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 12))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 24))
      (local.get $half_top)
      (local.get $height)
      (local.get $half_top)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 36))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (local.get $half_top)
    )

    ;; Back face.
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 48))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 60))
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 72))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (f32.neg (local.get $half_top))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 84))
      (local.get $half_top)
      (local.get $height)
      (f32.neg (local.get $half_top))
    )

    ;; Left face.
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 96))
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 108))
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 120))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (local.get $half_top)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 132))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (f32.neg (local.get $half_top))
    )

    ;; Right face.
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 144))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 156))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 168))
      (local.get $half_top)
      (local.get $height)
      (f32.neg (local.get $half_top))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 180))
      (local.get $half_top)
      (local.get $height)
      (local.get $half_top)
    )

    ;; Top face.
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 192))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (local.get $half_top)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 204))
      (local.get $half_top)
      (local.get $height)
      (local.get $half_top)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 216))
      (local.get $half_top)
      (local.get $height)
      (f32.neg (local.get $half_top))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 228))
      (f32.neg (local.get $half_top))
      (local.get $height)
      (f32.neg (local.get $half_top))
    )

    ;; Bottom face.
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 240))
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 252))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (f32.neg (local.get $half_bottom))
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 264))
      (local.get $half_bottom)
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )
    (call $store_vec3
      (i32.add (local.get $position_ptr) (i32.const 276))
      (f32.neg (local.get $half_bottom))
      (f32.neg (local.get $height))
      (local.get $half_bottom)
    )

    ;; Face colors.
    (call $store_vec3 (local.get $color_ptr) (f32.const 0.24) (f32.const 0.42) (f32.const 0.98))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 12)) (f32.const 0.24) (f32.const 0.42) (f32.const 0.98))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 24)) (f32.const 0.24) (f32.const 0.42) (f32.const 0.98))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 36)) (f32.const 0.24) (f32.const 0.42) (f32.const 0.98))

    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 48)) (f32.const 0.16) (f32.const 0.76) (f32.const 0.76))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 60)) (f32.const 0.16) (f32.const 0.76) (f32.const 0.76))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 72)) (f32.const 0.16) (f32.const 0.76) (f32.const 0.76))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 84)) (f32.const 0.16) (f32.const 0.76) (f32.const 0.76))

    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 96)) (f32.const 0.18) (f32.const 0.34) (f32.const 0.92))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 108)) (f32.const 0.18) (f32.const 0.34) (f32.const 0.92))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 120)) (f32.const 0.18) (f32.const 0.34) (f32.const 0.92))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 132)) (f32.const 0.18) (f32.const 0.34) (f32.const 0.92))

    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 144)) (f32.const 0.96) (f32.const 0.42) (f32.const 0.84))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 156)) (f32.const 0.96) (f32.const 0.42) (f32.const 0.84))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 168)) (f32.const 0.96) (f32.const 0.42) (f32.const 0.84))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 180)) (f32.const 0.96) (f32.const 0.42) (f32.const 0.84))

    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 192)) (f32.const 0.78) (f32.const 0.96) (f32.const 0.88))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 204)) (f32.const 0.78) (f32.const 0.96) (f32.const 0.88))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 216)) (f32.const 0.78) (f32.const 0.96) (f32.const 0.88))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 228)) (f32.const 0.78) (f32.const 0.96) (f32.const 0.88))

    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 240)) (f32.const 0.16) (f32.const 0.2) (f32.const 0.34))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 252)) (f32.const 0.16) (f32.const 0.2) (f32.const 0.34))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 264)) (f32.const 0.16) (f32.const 0.2) (f32.const 0.34))
    (call $store_vec3 (i32.add (local.get $color_ptr) (i32.const 276)) (f32.const 0.16) (f32.const 0.2) (f32.const 0.34))

    ;; Indices.
    (call $store_u32x3 (local.get $index_ptr) (i32.const 0) (i32.const 1) (i32.const 2))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 12)) (i32.const 0) (i32.const 2) (i32.const 3))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 24)) (i32.const 4) (i32.const 5) (i32.const 6))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 36)) (i32.const 4) (i32.const 6) (i32.const 7))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 48)) (i32.const 8) (i32.const 9) (i32.const 10))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 60)) (i32.const 8) (i32.const 10) (i32.const 11))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 72)) (i32.const 12) (i32.const 13) (i32.const 14))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 84)) (i32.const 12) (i32.const 14) (i32.const 15))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 96)) (i32.const 16) (i32.const 17) (i32.const 18))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 108)) (i32.const 16) (i32.const 18) (i32.const 19))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 120)) (i32.const 20) (i32.const 21) (i32.const 22))
    (call $store_u32x3 (i32.add (local.get $index_ptr) (i32.const 132)) (i32.const 20) (i32.const 22) (i32.const 23))
  )

  (func (export "fill_texture")
    (param $pixel_ptr i32)
    (param $width i32)
    (param $height i32)
    (param $tick i32)
    (local $x i32)
    (local $y i32)
    (local $pixel i32)
    (local $offset i32)
    (local $tile i32)
    (local $major i32)
    (local $minor i32)
    (local $sweep i32)

    (local.set $y (i32.const 0))
    (block $texture_done
      (loop $texture_rows
        (br_if $texture_done
          (i32.ge_u (local.get $y) (local.get $height))
        )

        (local.set $x (i32.const 0))
        (block $texture_row_done
          (loop $texture_loop
            (br_if $texture_row_done
              (i32.ge_u (local.get $x) (local.get $width))
            )

            (local.set $pixel
              (i32.add
                (local.get $x)
                (i32.mul (local.get $y) (local.get $width))
              )
            )
            (local.set $offset
              (i32.add
                (local.get $pixel_ptr)
                (i32.mul (local.get $pixel) (i32.const 4))
              )
            )
            (local.set $tile
              (i32.mul
                (i32.and
                  (i32.xor
                    (i32.shr_u (local.get $x) (i32.const 4))
                    (i32.shr_u (local.get $y) (i32.const 4))
                  )
                  (i32.const 1)
                )
                (i32.const 44)
              )
            )
            (local.set $major
              (i32.or
                (i32.eqz (i32.and (local.get $x) (i32.const 31)))
                (i32.eqz (i32.and (local.get $y) (i32.const 31)))
              )
            )
            (local.set $minor
              (i32.or
                (i32.eqz (i32.and (local.get $x) (i32.const 15)))
                (i32.eqz (i32.and (local.get $y) (i32.const 15)))
              )
            )
            (local.set $sweep
              (i32.mul
                (i32.and
                  (i32.shr_u
                    (i32.add
                      (local.get $x)
                      (i32.mul (local.get $tick) (i32.const 6))
                    )
                    (i32.const 4)
                  )
                  (i32.const 1)
                )
                (i32.const 24)
              )
            )

            (i32.store8 (local.get $offset)
              (i32.add
                (i32.add
                  (i32.add (i32.const 20) (local.get $tile))
                  (i32.mul (local.get $major) (i32.const 18))
                )
                (local.get $sweep)
              )
            )
            (i32.store8 offset=1 (local.get $offset)
              (i32.add
                (i32.add
                  (i32.add (i32.const 48) (local.get $tile))
                  (i32.mul (local.get $minor) (i32.const 54))
                )
                (i32.mul (local.get $major) (i32.const 34))
              )
            )
            (i32.store8 offset=2 (local.get $offset)
              (i32.add
                (i32.add
                  (i32.add (i32.const 96) (local.get $tile))
                  (i32.mul (local.get $minor) (i32.const 52))
                )
                (i32.mul (local.get $major) (i32.const 60))
              )
            )
            (i32.store8 offset=3 (local.get $offset) (i32.const 255))

            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $texture_loop)
          )
        )

        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $texture_rows)
      )
    )
  )

  (func (export "fill_lighting_state")
    (param $state_ptr i32)
    (param $setup i32)
    (param $phase f32)
    (local $ambient f32)
    (local $hemi f32)
    (local $directional f32)
    (local $point f32)
    (local $spot f32)

    (local.set $ambient (f32.const 0.24))
    (local.set $hemi (f32.const 0.68))
    (local.set $directional (f32.const 1.5))
    (local.set $point (f32.const 1.08))
    (local.set $spot (f32.const 0.92))

    (if (i32.eq (local.get $setup) (i32.const 1))
      (then
        (local.set $ambient (f32.const 0.58))
        (local.set $hemi (f32.const 0.08))
        (local.set $directional (f32.const 0.0))
        (local.set $point (f32.const 0.0))
        (local.set $spot (f32.const 0.0))
      )
    )
    (if (i32.eq (local.get $setup) (i32.const 2))
      (then
        (local.set $ambient (f32.const 0.06))
        (local.set $hemi (f32.const 0.96))
        (local.set $directional (f32.const 0.0))
        (local.set $point (f32.const 0.0))
        (local.set $spot (f32.const 0.0))
      )
    )
    (if (i32.eq (local.get $setup) (i32.const 3))
      (then
        (local.set $ambient (f32.const 0.06))
        (local.set $hemi (f32.const 0.16))
        (local.set $directional (f32.const 1.84))
        (local.set $point (f32.const 0.0))
        (local.set $spot (f32.const 0.0))
      )
    )
    (if (i32.eq (local.get $setup) (i32.const 4))
      (then
        (local.set $ambient (f32.const 0.06))
        (local.set $hemi (f32.const 0.12))
        (local.set $directional (f32.const 0.0))
        (local.set $point (f32.const 1.54))
        (local.set $spot (f32.const 0.0))
      )
    )
    (if (i32.eq (local.get $setup) (i32.const 5))
      (then
        (local.set $ambient (f32.const 0.06))
        (local.set $hemi (f32.const 0.12))
        (local.set $directional (f32.const 0.0))
        (local.set $point (f32.const 0.3))
        (local.set $spot (f32.const 1.4))
      )
    )

    (f32.store (local.get $state_ptr) (local.get $ambient))
    (f32.store offset=4 (local.get $state_ptr) (local.get $hemi))
    (f32.store offset=8
      (local.get $state_ptr)
      (f32.mul
        (local.get $directional)
        (f32.add (f32.const 1.0) (f32.mul (local.get $phase) (f32.const 0.08)))
      )
    )
    (f32.store offset=12
      (local.get $state_ptr)
      (f32.mul
        (local.get $point)
        (f32.add (f32.const 1.0) (f32.mul (local.get $phase) (f32.const 0.12)))
      )
    )
    (f32.store offset=16
      (local.get $state_ptr)
      (f32.mul
        (local.get $spot)
        (f32.sub (f32.const 1.0) (f32.mul (local.get $phase) (f32.const 0.09)))
      )
    )

    (f32.store offset=20
      (local.get $state_ptr)
      (f32.add (f32.const 2.6) (f32.mul (local.get $phase) (f32.const 0.4)))
    )
    (f32.store offset=24 (local.get $state_ptr) (f32.const 3.8))
    (f32.store offset=28
      (local.get $state_ptr)
      (f32.sub (f32.const 1.8) (f32.mul (local.get $phase) (f32.const 0.3)))
    )

    (f32.store offset=32
      (local.get $state_ptr)
      (f32.add (f32.const -1.8) (f32.mul (local.get $phase) (f32.const 0.9)))
    )
    (f32.store offset=36 (local.get $state_ptr) (f32.const 1.6))
    (f32.store offset=40
      (local.get $state_ptr)
      (f32.sub (f32.const 1.8) (f32.mul (local.get $phase) (f32.const 0.7)))
    )

    (f32.store offset=44
      (local.get $state_ptr)
      (f32.sub (f32.const 1.4) (f32.mul (local.get $phase) (f32.const 0.8)))
    )
    (f32.store offset=48 (local.get $state_ptr) (f32.const 3.2))
    (f32.store offset=52
      (local.get $state_ptr)
      (f32.add (f32.const 2.4) (f32.mul (local.get $phase) (f32.const 0.4)))
    )

    (f32.store offset=56
      (local.get $state_ptr)
      (f32.mul (local.get $phase) (f32.const 0.18))
    )
    (f32.store offset=60
      (local.get $state_ptr)
      (f32.add (f32.const 0.72) (f32.mul (local.get $phase) (f32.const 0.16)))
    )
  )

  (func (export "build_terrain_mesh")
    (param $position_ptr i32)
    (param $normal_ptr i32)
    (param $color_ptr i32)
    (param $index_ptr i32)
    (param $resolution i32)
    (param $phase f32)
    (param $amplitude f32)
    (param $roughness f32)
    (local $span i32)
    (local $vertex_count i32)
    (local $vertex_index i32)
    (local $index_cursor i32)
    (local $x i32)
    (local $z i32)
    (local $a i32)
    (local $b i32)
    (local $c i32)
    (local $d i32)
    (local $vertex_offset i32)
    (local $index_offset i32)
    (local $cell_size f32)
    (local $world_x f32)
    (local $world_z f32)
    (local $height f32)
    (local $height_l f32)
    (local $height_r f32)
    (local $height_d f32)
    (local $height_u f32)
    (local $nx f32)
    (local $ny f32)
    (local $nz f32)
    (local $normal_len f32)
    (local $height01 f32)
    (local $snow f32)
    (local $warm f32)
    (local $green f32)
    (local $blue f32)

    (local.set $span
      (i32.add (local.get $resolution) (i32.const 1))
    )
    (local.set $vertex_count
      (i32.mul (local.get $span) (local.get $span))
    )
    (local.set $cell_size
      (f32.div
        (f32.const 8.4)
        (f32.convert_i32_u (local.get $resolution))
      )
    )

    (local.set $vertex_index (i32.const 0))
    (block $vertex_done
      (loop $vertex_loop
        (br_if $vertex_done
          (i32.ge_u (local.get $vertex_index) (local.get $vertex_count))
        )

        (local.set $x
          (i32.rem_u (local.get $vertex_index) (local.get $span))
        )
        (local.set $z
          (i32.div_u (local.get $vertex_index) (local.get $span))
        )
        (local.set $world_x
          (f32.sub
            (f32.mul
              (f32.convert_i32_u (local.get $x))
              (local.get $cell_size)
            )
            (f32.const 4.2)
          )
        )
        (local.set $world_z
          (f32.sub
            (f32.mul
              (f32.convert_i32_u (local.get $z))
              (local.get $cell_size)
            )
            (f32.const 4.2)
          )
        )

        (local.set $height
          (call $terrain_height
            (local.get $world_x)
            (local.get $world_z)
            (local.get $phase)
            (local.get $amplitude)
            (local.get $roughness)
          )
        )
        (local.set $height_l
          (call $terrain_height
            (f32.sub (local.get $world_x) (local.get $cell_size))
            (local.get $world_z)
            (local.get $phase)
            (local.get $amplitude)
            (local.get $roughness)
          )
        )
        (local.set $height_r
          (call $terrain_height
            (f32.add (local.get $world_x) (local.get $cell_size))
            (local.get $world_z)
            (local.get $phase)
            (local.get $amplitude)
            (local.get $roughness)
          )
        )
        (local.set $height_d
          (call $terrain_height
            (local.get $world_x)
            (f32.sub (local.get $world_z) (local.get $cell_size))
            (local.get $phase)
            (local.get $amplitude)
            (local.get $roughness)
          )
        )
        (local.set $height_u
          (call $terrain_height
            (local.get $world_x)
            (f32.add (local.get $world_z) (local.get $cell_size))
            (local.get $phase)
            (local.get $amplitude)
            (local.get $roughness)
          )
        )

        (local.set $nx
          (f32.sub (local.get $height_l) (local.get $height_r))
        )
        (local.set $ny
          (f32.mul (local.get $cell_size) (f32.const 2.0))
        )
        (local.set $nz
          (f32.sub (local.get $height_d) (local.get $height_u))
        )
        (local.set $normal_len
          (f32.sqrt
            (f32.add
              (f32.add
                (f32.mul (local.get $nx) (local.get $nx))
                (f32.mul (local.get $ny) (local.get $ny))
              )
              (f32.mul (local.get $nz) (local.get $nz))
            )
          )
        )
        (local.set $nx
          (f32.div (local.get $nx) (local.get $normal_len))
        )
        (local.set $ny
          (f32.div (local.get $ny) (local.get $normal_len))
        )
        (local.set $nz
          (f32.div (local.get $nz) (local.get $normal_len))
        )

        (local.set $height01
          (f32.min
            (f32.const 1.0)
            (f32.max
              (f32.const 0.0)
              (f32.add
                (f32.const 0.5)
                (f32.div
                  (local.get $height)
                  (f32.max
                    (f32.mul (local.get $amplitude) (f32.const 2.35))
                    (f32.const 0.001)
                  )
                )
              )
            )
          )
        )
        (local.set $snow
          (f32.min
            (f32.const 1.0)
            (f32.max
              (f32.const 0.0)
              (f32.add
                (f32.mul
                  (f32.sub (local.get $height01) (f32.const 0.68))
                  (f32.const 2.2)
                )
                (f32.mul
                  (f32.sub (f32.const 1.0) (local.get $ny))
                  (f32.const 0.12)
                )
              )
            )
          )
        )
        (local.set $warm
          (f32.min
            (f32.const 1.0)
            (f32.max
              (f32.const 0.0)
              (f32.add
                (f32.add
                  (f32.const 0.12)
                  (f32.mul (local.get $height01) (f32.const 0.22))
                )
                (f32.mul
                  (f32.sub (f32.const 1.0) (local.get $ny))
                  (f32.const 0.09)
                )
              )
            )
          )
        )
        (local.set $green
          (f32.min
            (f32.const 1.0)
            (f32.max
              (f32.const 0.0)
              (f32.add
                (f32.add
                  (f32.sub
                    (f32.add
                      (f32.const 0.22)
                      (f32.mul (local.get $height01) (f32.const 0.44))
                    )
                    (f32.mul
                      (f32.sub (f32.const 1.0) (local.get $ny))
                      (f32.const 0.1)
                    )
                  )
                  (f32.mul (local.get $snow) (f32.const 0.08))
                )
                (f32.const 0.0)
              )
            )
          )
        )
        (local.set $blue
          (f32.min
            (f32.const 1.0)
            (f32.max
              (f32.const 0.0)
              (f32.add
                (f32.add
                  (f32.add
                    (f32.const 0.18)
                    (f32.mul (local.get $height01) (f32.const 0.26))
                  )
                  (f32.mul
                    (f32.sub (f32.const 1.0) (local.get $ny))
                    (f32.const 0.14)
                  )
                )
                (f32.mul (local.get $snow) (f32.const 0.18))
              )
            )
          )
        )

        (local.set $vertex_offset
          (i32.mul (local.get $vertex_index) (i32.const 12))
        )

        (call $store_vec3
          (i32.add (local.get $position_ptr) (local.get $vertex_offset))
          (local.get $world_x)
          (local.get $height)
          (local.get $world_z)
        )
        (call $store_vec3
          (i32.add (local.get $normal_ptr) (local.get $vertex_offset))
          (local.get $nx)
          (local.get $ny)
          (local.get $nz)
        )
        (call $store_vec3
          (i32.add (local.get $color_ptr) (local.get $vertex_offset))
          (local.get $warm)
          (local.get $green)
          (local.get $blue)
        )

        (local.set $vertex_index (i32.add (local.get $vertex_index) (i32.const 1)))
        (br $vertex_loop)
      )
    )

    (local.set $index_cursor (i32.const 0))
    (local.set $z (i32.const 0))
    (block $index_done
      (loop $z_loop
        (br_if $index_done
          (i32.ge_u (local.get $z) (local.get $resolution))
        )

        (local.set $x (i32.const 0))
        (block $x_done
          (loop $x_loop
            (br_if $x_done
              (i32.ge_u (local.get $x) (local.get $resolution))
            )

            (local.set $a
              (i32.add
                (i32.mul (local.get $z) (local.get $span))
                (local.get $x)
              )
            )
            (local.set $b
              (i32.add (local.get $a) (i32.const 1))
            )
            (local.set $c
              (i32.add (local.get $a) (local.get $span))
            )
            (local.set $d
              (i32.add (local.get $c) (i32.const 1))
            )
            (local.set $index_offset
              (i32.mul (local.get $index_cursor) (i32.const 4))
            )

            (call $store_u32x3
              (i32.add (local.get $index_ptr) (local.get $index_offset))
              (local.get $a)
              (local.get $c)
              (local.get $b)
            )
            (call $store_u32x3
              (i32.add (local.get $index_ptr) (i32.add (local.get $index_offset) (i32.const 12)))
              (local.get $b)
              (local.get $c)
              (local.get $d)
            )

            (local.set $index_cursor (i32.add (local.get $index_cursor) (i32.const 6)))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $x_loop)
          )
        )

        (local.set $z (i32.add (local.get $z) (i32.const 1)))
        (br $z_loop)
      )
    )
  )

  (func (export "seed_swarm")
    (param $state_ptr i32)
    (param $count i32)
    (local $index i32)
    (local $offset i32)
    (local $x_seed i32)
    (local $y_seed i32)
    (local $z_seed i32)
    (local $radius_seed i32)
    (local $lift_seed i32)

    (local.set $index (i32.const 0))
    (block $done
      (loop $seed_loop
        (br_if $done
          (i32.ge_u (local.get $index) (local.get $count))
        )

        (local.set $offset
          (i32.mul (local.get $index) (i32.const 32))
        )
        (local.set $x_seed
          (i32.rem_u
            (i32.add (i32.mul (local.get $index) (i32.const 17)) (i32.const 3))
            (i32.const 97)
          )
        )
        (local.set $y_seed
          (i32.rem_u
            (i32.add (i32.mul (local.get $index) (i32.const 29)) (i32.const 11))
            (i32.const 67)
          )
        )
        (local.set $z_seed
          (i32.rem_u
            (i32.add (i32.mul (local.get $index) (i32.const 31)) (i32.const 19))
            (i32.const 103)
          )
        )
        (local.set $radius_seed
          (i32.rem_u
            (i32.add (i32.mul (local.get $index) (i32.const 13)) (i32.const 7))
            (i32.const 41)
          )
        )
        (local.set $lift_seed
          (i32.rem_u
            (i32.add (i32.mul (local.get $index) (i32.const 19)) (i32.const 5))
            (i32.const 37)
          )
        )

        (f32.store
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.mul
            (f32.sub
              (f32.div (f32.convert_i32_u (local.get $x_seed)) (f32.const 97.0))
              (f32.const 0.5)
            )
            (f32.const 6.2)
          )
        )
        (f32.store offset=4
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.mul
            (f32.sub
              (f32.div (f32.convert_i32_u (local.get $y_seed)) (f32.const 67.0))
              (f32.const 0.5)
            )
            (f32.const 2.4)
          )
        )
        (f32.store offset=8
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.mul
            (f32.sub
              (f32.div (f32.convert_i32_u (local.get $z_seed)) (f32.const 103.0))
              (f32.const 0.5)
            )
            (f32.const 6.2)
          )
        )

        (f32.store offset=12
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.const 0.0)
        )
        (f32.store offset=16
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.const 0.0)
        )
        (f32.store offset=20
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.const 0.0)
        )

        (f32.store offset=24
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.add
            (f32.const 0.7)
            (f32.mul
              (f32.div (f32.convert_i32_u (local.get $radius_seed)) (f32.const 41.0))
              (f32.const 1.3)
            )
          )
        )
        (f32.store offset=28
          (i32.add (local.get $state_ptr) (local.get $offset))
          (f32.mul
            (f32.sub
              (f32.div (f32.convert_i32_u (local.get $lift_seed)) (f32.const 37.0))
              (f32.const 0.5)
            )
            (f32.const 1.4)
          )
        )

        (local.set $index (i32.add (local.get $index) (i32.const 1)))
        (br $seed_loop)
      )
    )
  )

  (func (export "step_swarm")
    (param $state_ptr i32)
    (param $grid_head_ptr i32)
    (param $grid_next_ptr i32)
    (param $matrix_ptr i32)
    (param $count i32)
    (param $dt f32)
    (param $spread f32)
    (param $lift f32)
    (local $index i32)
    (local $cell_cursor i32)
    (local $state_offset i32)
    (local $matrix_offset i32)
    (local $cell_x i32)
    (local $cell_z i32)
    (local $cell_index i32)
    (local $x_min i32)
    (local $x_max i32)
    (local $z_min i32)
    (local $z_max i32)
    (local $x i32)
    (local $z i32)
    (local $neighbor i32)
    (local $neighbor_offset i32)
    (local $neighbor_count i32)
    (local $px f32)
    (local $py f32)
    (local $pz f32)
    (local $vx f32)
    (local $vy f32)
    (local $vz f32)
    (local $radial_bias f32)
    (local $lift_bias f32)
    (local $radius f32)
    (local $inv_radius f32)
    (local $target_radius f32)
    (local $tangent_x f32)
    (local $tangent_z f32)
    (local $radial_pull f32)
    (local $desired_x f32)
    (local $desired_y f32)
    (local $desired_z f32)
    (local $neighbor_radius f32)
    (local $neighbor_radius_sq f32)
    (local $separation_x f32)
    (local $separation_y f32)
    (local $separation_z f32)
    (local $cohesion_x f32)
    (local $cohesion_y f32)
    (local $cohesion_z f32)
    (local $alignment_x f32)
    (local $alignment_y f32)
    (local $alignment_z f32)
    (local $dx f32)
    (local $dy f32)
    (local $dz f32)
    (local $distance_sq f32)
    (local $weight f32)
    (local $inv_distance f32)
    (local $inv_count f32)
    (local $forward_x f32)
    (local $forward_z f32)
    (local $forward_len f32)
    (local $fx f32)
    (local $fz f32)
    (local $scale_x f32)
    (local $scale_y f32)
    (local $scale_z f32)

    (local.set $cell_cursor (i32.const 0))
    (block $clear_done
      (loop $clear_loop
        (br_if $clear_done
          (i32.ge_u (local.get $cell_cursor) (i32.const 4096))
        )
        (i32.store
          (i32.add (local.get $grid_head_ptr) (i32.mul (local.get $cell_cursor) (i32.const 4)))
          (i32.const -1)
        )
        (local.set $cell_cursor (i32.add (local.get $cell_cursor) (i32.const 1)))
        (br $clear_loop)
      )
    )

    (local.set $index (i32.const 0))
    (block $grid_done
      (loop $grid_loop
        (br_if $grid_done
          (i32.ge_u (local.get $index) (local.get $count))
        )
        (local.set $state_offset
          (i32.mul (local.get $index) (i32.const 32))
        )
        (local.set $cell_x
          (call $grid_coord
            (f32.load (i32.add (local.get $state_ptr) (local.get $state_offset)))
          )
        )
        (local.set $cell_z
          (call $grid_coord
            (f32.load offset=8 (i32.add (local.get $state_ptr) (local.get $state_offset)))
          )
        )
        (local.set $cell_index
          (i32.add
            (i32.mul (local.get $cell_z) (i32.const 64))
            (local.get $cell_x)
          )
        )
        (i32.store
          (i32.add (local.get $grid_next_ptr) (i32.mul (local.get $index) (i32.const 4)))
          (i32.load
            (i32.add (local.get $grid_head_ptr) (i32.mul (local.get $cell_index) (i32.const 4)))
          )
        )
        (i32.store
          (i32.add (local.get $grid_head_ptr) (i32.mul (local.get $cell_index) (i32.const 4)))
          (local.get $index)
        )
        (local.set $index (i32.add (local.get $index) (i32.const 1)))
        (br $grid_loop)
      )
    )

    (local.set $index (i32.const 0))
    (block $done
      (loop $step_loop
        (br_if $done
          (i32.ge_u (local.get $index) (local.get $count))
        )

        (local.set $state_offset
          (i32.mul (local.get $index) (i32.const 32))
        )
        (local.set $matrix_offset
          (i32.mul (local.get $index) (i32.const 64))
        )

        (local.set $px
          (f32.load (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $py
          (f32.load offset=4 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $pz
          (f32.load offset=8 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $vx
          (f32.load offset=12 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $vy
          (f32.load offset=16 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $vz
          (f32.load offset=20 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $radial_bias
          (f32.load offset=24 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )
        (local.set $lift_bias
          (f32.load offset=28 (i32.add (local.get $state_ptr) (local.get $state_offset)))
        )

        (local.set $radius
          (f32.sqrt
            (f32.add
              (f32.add
                (f32.mul (local.get $px) (local.get $px))
                (f32.mul (local.get $pz) (local.get $pz))
              )
              (f32.const 0.0001)
            )
          )
        )
        (local.set $inv_radius
          (f32.div (f32.const 1.0) (local.get $radius))
        )
        (local.set $target_radius
          (f32.add
            (f32.const 1.2)
            (f32.mul
              (f32.mul (local.get $radial_bias) (local.get $spread))
              (f32.const 1.45)
            )
          )
        )
        (local.set $tangent_x
          (f32.mul
            (f32.mul (f32.neg (local.get $pz)) (local.get $inv_radius))
            (f32.const 3.4)
          )
        )
        (local.set $tangent_z
          (f32.mul
            (f32.mul (local.get $px) (local.get $inv_radius))
            (f32.const 3.4)
          )
        )
        (local.set $radial_pull
          (f32.mul
            (f32.sub (local.get $target_radius) (local.get $radius))
            (f32.const 1.25)
          )
        )
        (local.set $desired_x
          (f32.add
            (local.get $tangent_x)
            (f32.mul
              (f32.mul (local.get $px) (local.get $inv_radius))
              (local.get $radial_pull)
            )
          )
        )
        (local.set $desired_y
          (f32.sub
            (f32.mul
              (f32.mul (local.get $lift_bias) (local.get $lift))
              (f32.const 1.6)
            )
            (f32.mul (local.get $py) (f32.const 0.75))
          )
        )
        (local.set $desired_z
          (f32.add
            (local.get $tangent_z)
            (f32.mul
              (f32.mul (local.get $pz) (local.get $inv_radius))
              (local.get $radial_pull)
            )
          )
        )

        (local.set $cell_x (call $grid_coord (local.get $px)))
        (local.set $cell_z (call $grid_coord (local.get $pz)))
        (local.set $neighbor_radius
          (f32.add
            (f32.const 0.42)
            (f32.mul (local.get $radial_bias) (f32.const 0.35))
          )
        )
        (local.set $neighbor_radius_sq
          (f32.mul (local.get $neighbor_radius) (local.get $neighbor_radius))
        )
        (local.set $separation_x (f32.const 0.0))
        (local.set $separation_y (f32.const 0.0))
        (local.set $separation_z (f32.const 0.0))
        (local.set $cohesion_x (f32.const 0.0))
        (local.set $cohesion_y (f32.const 0.0))
        (local.set $cohesion_z (f32.const 0.0))
        (local.set $alignment_x (f32.const 0.0))
        (local.set $alignment_y (f32.const 0.0))
        (local.set $alignment_z (f32.const 0.0))
        (local.set $neighbor_count (i32.const 0))

        (local.set $x_min
          (call $clamp_i32
            (i32.sub (local.get $cell_x) (i32.const 1))
            (i32.const 0)
            (i32.const 63)
          )
        )
        (local.set $x_max
          (call $clamp_i32
            (i32.add (local.get $cell_x) (i32.const 1))
            (i32.const 0)
            (i32.const 63)
          )
        )
        (local.set $z_min
          (call $clamp_i32
            (i32.sub (local.get $cell_z) (i32.const 1))
            (i32.const 0)
            (i32.const 63)
          )
        )
        (local.set $z_max
          (call $clamp_i32
            (i32.add (local.get $cell_z) (i32.const 1))
            (i32.const 0)
            (i32.const 63)
          )
        )

        (local.set $z (local.get $z_min))
        (block $z_done
          (loop $z_loop
            (br_if $z_done
              (i32.gt_s (local.get $z) (local.get $z_max))
            )

            (local.set $x (local.get $x_min))
            (block $x_done
              (loop $x_loop
                (br_if $x_done
                  (i32.gt_s (local.get $x) (local.get $x_max))
                )

                (local.set $neighbor
                  (i32.load
                    (i32.add
                      (local.get $grid_head_ptr)
                      (i32.mul
                        (i32.add
                          (i32.mul (local.get $z) (i32.const 64))
                          (local.get $x)
                        )
                        (i32.const 4)
                      )
                    )
                  )
                )

                (block $neighbor_done
                  (loop $neighbor_loop
                    (br_if $neighbor_done
                      (i32.eq (local.get $neighbor) (i32.const -1))
                    )

                    (if
                      (i32.ne (local.get $neighbor) (local.get $index))
                      (then
                        (local.set $neighbor_offset
                          (i32.mul (local.get $neighbor) (i32.const 32))
                        )
                        (local.set $dx
                          (f32.sub
                            (f32.load (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                            (local.get $px)
                          )
                        )
                        (local.set $dy
                          (f32.sub
                            (f32.load offset=4 (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                            (local.get $py)
                          )
                        )
                        (local.set $dz
                          (f32.sub
                            (f32.load offset=8 (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                            (local.get $pz)
                          )
                        )
                        (local.set $distance_sq
                          (f32.add
                            (f32.add
                              (f32.mul (local.get $dx) (local.get $dx))
                              (f32.mul (local.get $dy) (local.get $dy))
                            )
                            (f32.mul (local.get $dz) (local.get $dz))
                          )
                        )

                        (if
                          (f32.gt (local.get $distance_sq) (f32.const 0.0001))
                          (then
                            (if
                              (f32.lt (local.get $distance_sq) (local.get $neighbor_radius_sq))
                              (then
                                (local.set $weight
                                  (f32.sub
                                    (f32.const 1.0)
                                    (f32.div (local.get $distance_sq) (local.get $neighbor_radius_sq))
                                  )
                                )
                                (local.set $inv_distance
                                  (f32.div
                                    (f32.const 1.0)
                                    (f32.sqrt (local.get $distance_sq))
                                  )
                                )
                                (local.set $separation_x
                                  (f32.sub
                                    (local.get $separation_x)
                                    (f32.mul
                                      (f32.mul (local.get $dx) (local.get $inv_distance))
                                      (local.get $weight)
                                    )
                                  )
                                )
                                (local.set $separation_y
                                  (f32.sub
                                    (local.get $separation_y)
                                    (f32.mul
                                      (f32.mul (local.get $dy) (local.get $inv_distance))
                                      (local.get $weight)
                                    )
                                  )
                                )
                                (local.set $separation_z
                                  (f32.sub
                                    (local.get $separation_z)
                                    (f32.mul
                                      (f32.mul (local.get $dz) (local.get $inv_distance))
                                      (local.get $weight)
                                    )
                                  )
                                )
                                (local.set $cohesion_x
                                  (f32.add
                                    (local.get $cohesion_x)
                                    (f32.add (local.get $px) (local.get $dx))
                                  )
                                )
                                (local.set $cohesion_y
                                  (f32.add
                                    (local.get $cohesion_y)
                                    (f32.add (local.get $py) (local.get $dy))
                                  )
                                )
                                (local.set $cohesion_z
                                  (f32.add
                                    (local.get $cohesion_z)
                                    (f32.add (local.get $pz) (local.get $dz))
                                  )
                                )
                                (local.set $alignment_x
                                  (f32.add
                                    (local.get $alignment_x)
                                    (f32.load offset=12 (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                                  )
                                )
                                (local.set $alignment_y
                                  (f32.add
                                    (local.get $alignment_y)
                                    (f32.load offset=16 (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                                  )
                                )
                                (local.set $alignment_z
                                  (f32.add
                                    (local.get $alignment_z)
                                    (f32.load offset=20 (i32.add (local.get $state_ptr) (local.get $neighbor_offset)))
                                  )
                                )
                                (local.set $neighbor_count
                                  (i32.add (local.get $neighbor_count) (i32.const 1))
                                )
                              )
                            )
                          )
                        )
                      )
                    )

                    (local.set $neighbor
                      (i32.load
                        (i32.add
                          (local.get $grid_next_ptr)
                          (i32.mul (local.get $neighbor) (i32.const 4))
                        )
                      )
                    )
                    (br $neighbor_loop)
                  )
                )

                (local.set $x (i32.add (local.get $x) (i32.const 1)))
                (br $x_loop)
              )
            )

            (local.set $z (i32.add (local.get $z) (i32.const 1)))
            (br $z_loop)
          )
        )

        (if
          (i32.gt_s (local.get $neighbor_count) (i32.const 0))
          (then
            (local.set $inv_count
              (f32.div
                (f32.const 1.0)
                (f32.convert_i32_u (local.get $neighbor_count))
              )
            )
            (local.set $desired_x
              (f32.add
                (local.get $desired_x)
                (f32.add
                  (f32.mul (local.get $separation_x) (f32.const 1.6))
                  (f32.add
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $cohesion_x) (local.get $inv_count))
                        (local.get $px)
                      )
                      (f32.const 0.35)
                    )
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $alignment_x) (local.get $inv_count))
                        (local.get $vx)
                      )
                      (f32.const 0.22)
                    )
                  )
                )
              )
            )
            (local.set $desired_y
              (f32.add
                (local.get $desired_y)
                (f32.add
                  (f32.mul (local.get $separation_y) (f32.const 1.2))
                  (f32.add
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $cohesion_y) (local.get $inv_count))
                        (local.get $py)
                      )
                      (f32.const 0.22)
                    )
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $alignment_y) (local.get $inv_count))
                        (local.get $vy)
                      )
                      (f32.const 0.18)
                    )
                  )
                )
              )
            )
            (local.set $desired_z
              (f32.add
                (local.get $desired_z)
                (f32.add
                  (f32.mul (local.get $separation_z) (f32.const 1.6))
                  (f32.add
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $cohesion_z) (local.get $inv_count))
                        (local.get $pz)
                      )
                      (f32.const 0.35)
                    )
                    (f32.mul
                      (f32.sub
                        (f32.mul (local.get $alignment_z) (local.get $inv_count))
                        (local.get $vz)
                      )
                      (f32.const 0.22)
                    )
                  )
                )
              )
            )
          )
        )

        (local.set $vx
          (f32.mul
            (f32.add
              (local.get $vx)
              (f32.mul
                (f32.sub (local.get $desired_x) (local.get $vx))
                (f32.mul (local.get $dt) (f32.const 2.8))
              )
            )
            (f32.const 0.992)
          )
        )
        (local.set $vy
          (f32.mul
            (f32.add
              (local.get $vy)
              (f32.mul
                (f32.sub (local.get $desired_y) (local.get $vy))
                (f32.mul (local.get $dt) (f32.const 2.2))
              )
            )
            (f32.const 0.993)
          )
        )
        (local.set $vz
          (f32.mul
            (f32.add
              (local.get $vz)
              (f32.mul
                (f32.sub (local.get $desired_z) (local.get $vz))
                (f32.mul (local.get $dt) (f32.const 2.8))
              )
            )
            (f32.const 0.992)
          )
        )

        (local.set $px
          (f32.add (local.get $px) (f32.mul (local.get $vx) (local.get $dt)))
        )
        (local.set $py
          (f32.add (local.get $py) (f32.mul (local.get $vy) (local.get $dt)))
        )
        (local.set $pz
          (f32.add (local.get $pz) (f32.mul (local.get $vz) (local.get $dt)))
        )

        (local.set $forward_x
          (f32.add
            (local.get $vx)
            (f32.mul (local.get $desired_x) (f32.const 0.5))
          )
        )
        (local.set $forward_z
          (f32.add
            (local.get $vz)
            (f32.mul (local.get $desired_z) (f32.const 0.5))
          )
        )
        (local.set $forward_len
          (f32.sqrt
            (f32.add
              (f32.add
                (f32.mul (local.get $forward_x) (local.get $forward_x))
                (f32.mul (local.get $forward_z) (local.get $forward_z))
              )
              (f32.const 0.0001)
            )
          )
        )
        (local.set $fx
          (f32.div (local.get $forward_x) (local.get $forward_len))
        )
        (local.set $fz
          (f32.div (local.get $forward_z) (local.get $forward_len))
        )
        (local.set $scale_x
          (f32.add
            (f32.const 0.13)
            (f32.mul (local.get $radial_bias) (f32.const 0.04))
          )
        )
        (local.set $scale_y
          (f32.add
            (f32.const 0.08)
            (f32.mul (local.get $radial_bias) (f32.const 0.03))
          )
        )
        (local.set $scale_z
          (f32.add
            (f32.const 0.32)
            (f32.mul (local.get $radial_bias) (f32.const 0.11))
          )
        )

        (f32.store
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.mul (local.get $fz) (local.get $scale_x))
        )
        (f32.store offset=4
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )
        (f32.store offset=8
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.mul (f32.neg (local.get $fx)) (local.get $scale_x))
        )
        (f32.store offset=12
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )

        (f32.store offset=16
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )
        (f32.store offset=20
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (local.get $scale_y)
        )
        (f32.store offset=24
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )
        (f32.store offset=28
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )

        (f32.store offset=32
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.mul (local.get $fx) (local.get $scale_z))
        )
        (f32.store offset=36
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )
        (f32.store offset=40
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.mul (local.get $fz) (local.get $scale_z))
        )
        (f32.store offset=44
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 0.0)
        )

        (f32.store offset=48
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (local.get $px)
        )
        (f32.store offset=52
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (local.get $py)
        )
        (f32.store offset=56
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (local.get $pz)
        )
        (f32.store offset=60
          (i32.add (local.get $matrix_ptr) (local.get $matrix_offset))
          (f32.const 1.0)
        )

        (f32.store
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $px)
        )
        (f32.store offset=4
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $py)
        )
        (f32.store offset=8
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $pz)
        )
        (f32.store offset=12
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $vx)
        )
        (f32.store offset=16
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $vy)
        )
        (f32.store offset=20
          (i32.add (local.get $state_ptr) (local.get $state_offset))
          (local.get $vz)
        )

        (local.set $index (i32.add (local.get $index) (i32.const 1)))
        (br $step_loop)
      )
    )
  )
)
