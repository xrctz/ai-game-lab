//! Night of the Dead — Rust simulation core
//!
//! Called from C# via P/Invoke for high-performance zombie AI + auto-aim scoring.
//! Layout of `ZombieState` must match C# `NativeZombie` exactly (`[StructLayout(LayoutKind.Sequential)]`).

use std::f32::consts::PI;

/// Mirror of C# NativeZombie — keep field order and types in sync.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ZombieState {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub speed: f32,
    pub attack_cd: f32,
    pub bob: f32,
    pub die_t: f32,
    pub yaw: f32,
    pub dead: i32,
    pub variant: i32,
}

const ARENA: f32 = 48.0;
const MAX_ZOMBIES: usize = 64;

/// Library version string for C# health check.
#[no_mangle]
pub extern "C" fn notd_sim_version() -> *const u8 {
    b"notd_sim 0.1.0 rust-ai\0".as_ptr()
}

/// Returns 1 if the library loaded and ABI is ready.
#[no_mangle]
pub extern "C" fn notd_sim_ping() -> i32 {
    1
}

/// Pick best auto-aim target index, or -1.
/// Wide forward cone — player does not need precise crosshair placement.
#[no_mangle]
pub unsafe extern "C" fn notd_pick_target(
    zombies: *const ZombieState,
    count: i32,
    cam_x: f32,
    cam_y: f32,
    cam_z: f32,
    look_x: f32,
    look_y: f32,
    look_z: f32,
) -> i32 {
    if zombies.is_null() || count <= 0 {
        return -1;
    }
    let n = count as usize;
    let slice = std::slice::from_raw_parts(zombies, n);

    let mut lx = look_x;
    let mut ly = look_y;
    let mut lz = look_z;
    let llen = (lx * lx + ly * ly + lz * lz).sqrt();
    if llen < 1e-5 {
        return -1;
    }
    lx /= llen;
    ly /= llen;
    lz /= llen;

    let mut best_i: i32 = -1;
    let mut best_score = f32::MAX;

    for (i, z) in slice.iter().enumerate() {
        if z.dead != 0 {
            continue;
        }
        let tx = z.x - cam_x;
        let ty = (z.y + 1.4) - cam_y;
        let tz = z.z - cam_z;
        let dist = (tx * tx + ty * ty + tz * tz).sqrt();
        if dist < 0.8 || dist > 55.0 {
            continue;
        }
        let inv = 1.0 / dist;
        let fx = tx * inv;
        let fy = ty * inv;
        let fz = tz * inv;
        let facing = lx * fx + ly * fy + lz * fz;
        // Wide lock-on cone
        if facing < 0.05 {
            continue;
        }
        let score = dist * 0.35 + (1.0 - facing) * 25.0;
        if score < best_score {
            best_score = score;
            best_i = i as i32;
        }
    }
    best_i
}

/// Batch-update zombie AI in Rust (move, separate, attack timers, death fade).
/// Writes player damage for this frame into `out_player_damage` (may be null).
/// Returns number of living zombies after update.
#[no_mangle]
pub unsafe extern "C" fn notd_update_zombies(
    zombies: *mut ZombieState,
    count: i32,
    player_x: f32,
    _player_y: f32,
    player_z: f32,
    dt: f32,
    wave: i32,
    out_player_damage: *mut f32,
) -> i32 {
    if zombies.is_null() || count <= 0 {
        if !out_player_damage.is_null() {
            *out_player_damage = 0.0;
        }
        return 0;
    }
    let n = (count as usize).min(MAX_ZOMBIES);
    let slice = std::slice::from_raw_parts_mut(zombies, n);
    let dt = dt.clamp(0.0, 0.05);
    let mut dmg_to_player = 0.0_f32;
    let half = ARENA - 1.0;

    // Death + chase pass
    for i in 0..n {
        if slice[i].dead != 0 {
            slice[i].die_t -= dt;
            slice[i].y -= dt * 0.9;
            continue;
        }

        let dx = player_x - slice[i].x;
        let dz = player_z - slice[i].z;
        let dist = (dx * dx + dz * dz).sqrt().max(0.001);
        let dir_x = dx / dist;
        let dir_z = dz / dist;
        slice[i].yaw = dir_x.atan2(dir_z);

        if dist > 1.25 {
            slice[i].x += dir_x * slice[i].speed * dt;
            slice[i].z += dir_z * slice[i].speed * dt;
            slice[i].x = slice[i].x.clamp(-half, half);
            slice[i].z = slice[i].z.clamp(-half, half);
            slice[i].bob += dt * 9.0;
        } else {
            slice[i].attack_cd -= dt;
            if slice[i].attack_cd <= 0.0 {
                dmg_to_player += 12.0 + wave as f32 * 1.5;
                slice[i].attack_cd = 0.85;
            }
        }
    }

    // Separation (O(n^2) but n is small — fine in Rust hot loop)
    for i in 0..n {
        if slice[i].dead != 0 {
            continue;
        }
        let mut sx = 0.0_f32;
        let mut sz = 0.0_f32;
        for j in 0..n {
            if i == j || slice[j].dead != 0 {
                continue;
            }
            let dx = slice[i].x - slice[j].x;
            let dz = slice[i].z - slice[j].z;
            let sd = (dx * dx + dz * dz).sqrt();
            if sd < 0.95 && sd > 0.001 {
                sx += (dx / sd) * 4.5 * dt;
                sz += (dz / sd) * 4.5 * dt;
            }
        }
        slice[i].x += sx;
        slice[i].z += sz;
    }

    let mut alive = 0;
    for z in slice.iter() {
        if z.dead == 0 {
            alive += 1;
        }
    }

    if !out_player_damage.is_null() {
        *out_player_damage = dmg_to_player;
    }
    // silence unused PI warning without allowing dead code warnings elsewhere
    let _ = PI;
    alive
}

/// Apply hitscan damage to a zombie index (auto-aim fire from C#).
/// `headshot` non-zero multiplies damage. Returns 1 if killed this shot.
#[no_mangle]
pub unsafe extern "C" fn notd_apply_hit(
    zombies: *mut ZombieState,
    count: i32,
    index: i32,
    damage: f32,
    headshot: i32,
) -> i32 {
    if zombies.is_null() || index < 0 || index >= count {
        return 0;
    }
    let z = &mut *zombies.add(index as usize);
    if z.dead != 0 {
        return 0;
    }
    let mul = if headshot != 0 { 2.4 } else { 1.0 };
    z.hp -= damage * mul;
    if z.hp <= 0.0 {
        z.dead = 1;
        z.die_t = 1.0;
        z.hp = 0.0;
        return 1;
    }
    0
}
