(module
  (memory (export "memory") 4)

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
)
