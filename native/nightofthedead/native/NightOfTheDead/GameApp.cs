using System.Numerics;
using Raylib_cs;

namespace NightOfTheDead;

/// <summary>
/// Night of the Dead — native Ubuntu 3D zombie FPS (C# + Raylib / OpenGL).
/// Visual pass: night fog atmosphere, lit ruins, better zombies, FPS gun, HUD.
/// </summary>
public static class GameApp
{
    const int ScreenW = 1600;
    const int ScreenH = 900;
    const float PlayerSpeed = 9f;
    const float SprintMul = 1.65f;
    const float JumpVel = 9f;
    const float Gravity = 28f;
    const float MouseSens = 0.0024f;
    const int MagSize = 12;
    const int ReserveStart = 48;
    const float FireCooldown = 0.14f;
    const float ReloadTime = 1.35f;
    const float BulletDamage = 34f;
    const float HeadshotMul = 2.4f;
    const float PlayerHeight = 1.7f;
    const float PlayerRadius = 0.45f;
    const float ArenaSize = 48f;
    const int MaxZombies = 40;

    // Palette — deliberately bright so the arena is always readable
    static readonly Color ColSkyTop = Rgb(55, 60, 90);
    static readonly Color ColSkyBot = Rgb(80, 70, 110);
    static readonly Color ColGround = Rgb(70, 78, 65);
    static readonly Color ColGround2 = Rgb(55, 60, 50);
    static readonly Color ColGrid = Rgb(90, 50, 50);
    static readonly Color ColWall = Rgb(72, 72, 88);
    static readonly Color ColWallDark = Rgb(48, 48, 58);
    static readonly Color ColRoof = Rgb(40, 36, 48);
    static readonly Color ColLamp = Rgb(255, 210, 120);
    static readonly Color ColLampGlow = Rgba(255, 190, 90, 70);
    static readonly Color ColSkin = Rgb(96, 128, 70);
    static readonly Color ColSkinDark = Rgb(64, 88, 48);
    static readonly Color ColShirt = Rgb(72, 58, 68);
    static readonly Color ColPants = Rgb(48, 52, 68);
    static readonly Color ColBlood = Rgb(180, 30, 36);
    static readonly Color ColUiRed = Rgb(255, 90, 90);
    static readonly Color ColUiGold = Rgb(255, 230, 140);
    static readonly Color ColUiMuted = Rgb(210, 210, 220);

    enum Phase { Menu, Playing, GameOver }

    struct Prop
    {
        public Vector3 Pos;
        public Vector3 Size;
        public Color Color;
        public Color? RoofColor;
        public bool Windows;
        public bool Collide;
    }

    sealed class Zombie
    {
        public Vector3 Pos;
        public float Hp, MaxHp, Speed, AttackCd, Bob, DieT, Yaw;
        public bool Dead;
        public int Variant; // 0-2 visual variety
    }

    sealed class Particle
    {
        public Vector3 Pos, Vel;
        public float Life, Size;
        public Color Color;
    }

    public static int Run(string[] args)
    {
        Raylib.SetConfigFlags(ConfigFlags.Msaa4xHint | ConfigFlags.VSyncHint);
        Raylib.InitWindow(ScreenW, ScreenH, "Night of the Dead — Native");
        Raylib.SetTargetFPS(120);
        Raylib.SetExitKey(KeyboardKey.Null);
        Raylib.InitAudioDevice();

        // Multi-language visuals: Python textures + GLSL post + JSON config
        using var visuals = VisualAssets.Load(ScreenW, ScreenH);

        var phase = Phase.Menu;
        float yaw = 0f, pitch = 0f, velY = 0f;
        bool onGround = true;
        float fireCd = 0f, reloadT = 0f, invuln = 0f;
        bool reloading = false;
        int hp = 100, mag = MagSize, reserve = ReserveStart;
        int wave = 1, kills = 0, score = 0;
        float spawnTimer = 0.5f;
        int waveSpawned = 0, waveTarget = 6;
        float muzzleFlash = 0f, damageFlash = 0f, walkBob = 0f;
        // Auto-aim / gun animation state
        Vector3 gunAimSmooth = new(0, 0, -1);
        float gunRecoil = 0f;
        float gunAnimT = 0f;
        Zombie? lockedTarget = null;

        var cam = new Camera3D
        {
            Position = new Vector3(0, PlayerHeight, 8),
            Target = new Vector3(0, PlayerHeight, 7),
            Up = Vector3.UnitY,
            FovY = 72f,
            Projection = CameraProjection.Perspective
        };

        var zombies = new List<Zombie>(MaxZombies);
        var particles = new List<Particle>(256);
        var props = BuildProps();
        var rng = new Random();

        while (!Raylib.WindowShouldClose())
        {
            float dt = Math.Clamp(Raylib.GetFrameTime(), 0f, 0.05f);

            if (phase == Phase.Menu)
            {
                // Idle camera drift on menu
                yaw += dt * 0.08f;
                var lookIdle = LookDir(yaw, -0.05f);
                cam.Position = new Vector3(MathF.Sin(yaw * 0.3f) * 2f, PlayerHeight + 0.2f, 10f);
                cam.Target = cam.Position + lookIdle;

                if (Raylib.IsKeyPressed(KeyboardKey.Enter) || Raylib.IsKeyPressed(KeyboardKey.Space)
                    || Raylib.IsMouseButtonPressed(MouseButton.Left))
                {
                    StartGame(ref phase, ref hp, ref mag, ref reserve, ref wave, ref kills, ref score,
                        ref yaw, ref pitch, ref velY, ref cam, zombies, particles, ref spawnTimer,
                        ref waveSpawned, ref waveTarget, ref fireCd, ref reloading, ref reloadT, ref invuln);
                    Raylib.DisableCursor();
                }
                if (Raylib.IsKeyPressed(KeyboardKey.Escape) || Raylib.IsKeyPressed(KeyboardKey.Q))
                    break;
            }
            else if (phase == Phase.GameOver)
            {
                if (Raylib.IsCursorHidden()) Raylib.EnableCursor();
                UpdateParticles(particles, dt);
                if (Raylib.IsKeyPressed(KeyboardKey.Enter) || Raylib.IsKeyPressed(KeyboardKey.Space)
                    || Raylib.IsMouseButtonPressed(MouseButton.Left) || Raylib.IsKeyPressed(KeyboardKey.R))
                {
                    StartGame(ref phase, ref hp, ref mag, ref reserve, ref wave, ref kills, ref score,
                        ref yaw, ref pitch, ref velY, ref cam, zombies, particles, ref spawnTimer,
                        ref waveSpawned, ref waveTarget, ref fireCd, ref reloading, ref reloadT, ref invuln);
                    Raylib.DisableCursor();
                }
                if (Raylib.IsKeyPressed(KeyboardKey.Escape)) phase = Phase.Menu;
            }
            else
            {
                if (Raylib.IsKeyPressed(KeyboardKey.Escape))
                {
                    if (Raylib.IsCursorHidden()) Raylib.EnableCursor();
                    else Raylib.DisableCursor();
                }

                if (Raylib.IsCursorHidden())
                {
                    Vector2 md = Raylib.GetMouseDelta();
                    yaw -= md.X * MouseSens;
                    pitch -= md.Y * MouseSens;
                    pitch = Math.Clamp(pitch, -1.35f, 1.35f);
                }

                var forward = new Vector3(-MathF.Sin(yaw), 0, -MathF.Cos(yaw));
                var right = new Vector3(MathF.Cos(yaw), 0, -MathF.Sin(yaw));
                var move = Vector3.Zero;
                if (Raylib.IsKeyDown(KeyboardKey.W) || Raylib.IsKeyDown(KeyboardKey.Up)) move += forward;
                if (Raylib.IsKeyDown(KeyboardKey.S) || Raylib.IsKeyDown(KeyboardKey.Down)) move -= forward;
                if (Raylib.IsKeyDown(KeyboardKey.A) || Raylib.IsKeyDown(KeyboardKey.Left)) move -= right;
                if (Raylib.IsKeyDown(KeyboardKey.D) || Raylib.IsKeyDown(KeyboardKey.Right)) move += right;
                bool moving = move.LengthSquared() > 0;
                if (moving)
                {
                    move = Vector3.Normalize(move);
                    float sprint = (Raylib.IsKeyDown(KeyboardKey.LeftShift) || Raylib.IsKeyDown(KeyboardKey.RightShift))
                        ? SprintMul : 1f;
                    move *= PlayerSpeed * sprint * dt;
                    TryMove(ref cam, move.X, move.Z, props);
                    walkBob += dt * 12f * sprint;
                }

                if (onGround && Raylib.IsKeyPressed(KeyboardKey.Space))
                {
                    velY = JumpVel;
                    onGround = false;
                }
                velY -= Gravity * dt;
                cam.Position.Y += velY * dt;
                if (cam.Position.Y <= PlayerHeight)
                {
                    cam.Position.Y = PlayerHeight;
                    velY = 0;
                    onGround = true;
                }

                float bobY = moving && onGround ? MathF.Sin(walkBob) * 0.04f : 0f;
                var look = LookDir(yaw, pitch);
                var eye = cam.Position + new Vector3(0, bobY, 0);
                cam.Target = eye + look;
                // slight eye height for look origin only in raycasts — keep Position as feet+height

                if (fireCd > 0) fireCd -= dt;
                if (invuln > 0) invuln -= dt;
                if (muzzleFlash > 0) muzzleFlash -= dt;
                if (damageFlash > 0) damageFlash -= dt;
                if (reloading)
                {
                    reloadT -= dt;
                    if (reloadT <= 0)
                    {
                        int need = MagSize - mag;
                        int take = Math.Min(need, reserve);
                        mag += take;
                        reserve -= take;
                        reloading = false;
                    }
                }

                if (Raylib.IsKeyPressed(KeyboardKey.R))
                    StartReload(ref reloading, ref reloadT, mag, reserve);

                // Auto-track (Rust pick_target when available, else C#)
                lockedTarget = FindAutoTarget(cam.Position, look, zombies);
                Vector3 desiredAim = look;
                if (lockedTarget != null)
                {
                    var lockPt = lockedTarget.Pos + new Vector3(0, 1.55f, 0);
                    desiredAim = Vector3.Normalize(lockPt - eye);
                }
                float trackSpeed = lockedTarget != null ? 14f : 8f;
                gunAimSmooth = Vector3.Normalize(Vector3.Lerp(gunAimSmooth, desiredAim, 1f - MathF.Exp(-trackSpeed * dt)));
                if (gunAimSmooth.LengthSquared() < 0.01f) gunAimSmooth = look;

                gunAnimT += dt;
                gunRecoil = MathF.Max(0f, gunRecoil - dt * 6f);

                bool wantFire = Raylib.IsCursorHidden() && Raylib.IsMouseButtonDown(MouseButton.Left);
                if (wantFire)
                {
                    TryShootAuto(
                        ref fireCd, ref mag, ref reserve, ref reloading, ref reloadT,
                        ref muzzleFlash, ref gunRecoil,
                        eye, gunAimSmooth, lockedTarget, zombies, particles,
                        ref kills, ref score, rng);
                }

                // Zombie AI: prefer Rust hot loop, C# fallback
                if (NativeSim.Available)
                    UpdateZombiesRust(zombies, cam.Position, dt, ref hp, ref invuln, ref damageFlash, wave);
                else
                    UpdateZombies(zombies, cam.Position, dt, ref hp, ref invuln, ref damageFlash, wave);

                UpdateWaves(zombies, ref wave, ref waveSpawned, ref waveTarget, ref spawnTimer, ref reserve, dt, rng);
                UpdateParticles(particles, dt);
                if (lockedTarget != null && lockedTarget.Dead) lockedTarget = null;

                if (hp <= 0)
                {
                    phase = Phase.GameOver;
                    if (Raylib.IsCursorHidden()) Raylib.EnableCursor();
                }
            }

            // ─── Draw (direct, bright, unlit — visible night) ────────
            visuals.BeginScene();

            Raylib.BeginMode3D(cam);
            DrawSkyDome(cam.Position);
            DrawWorld(props, cam.Position, visuals);
            foreach (var z in zombies) DrawZombie(z, visuals);
            foreach (var p in particles)
                Raylib.DrawSphere(p.Pos, p.Size, p.Color);
            if (phase == Phase.Playing)
                DrawViewGun3D(cam, gunAimSmooth, muzzleFlash, walkBob, reloading, gunRecoil, gunAnimT, lockedTarget != null);
            Raylib.EndMode3D();

            if (phase == Phase.Playing || phase == Phase.GameOver)
                DrawHud(hp, mag, reserve, wave, kills, score, reloading, muzzleFlash, damageFlash, lockedTarget, cam);
            if (phase == Phase.Playing && lockedTarget != null && !lockedTarget.Dead)
                DrawTargetLock(cam, lockedTarget);
            if (phase == Phase.Menu) DrawMenu();
            else if (phase == Phase.GameOver) DrawGameOver(wave, kills, score);
            Raylib.DrawFPS(ScreenW - 96, 10);
            string langs = NativeSim.Available
                ? "AUTO-AIM  |  hold LMB  |  C# + Rust AI + GLSL + Python"
                : "AUTO-AIM  |  hold LMB  |  C# + GLSL + Python (Rust off)";
            Raylib.DrawText(langs, 12, ScreenH - 48, 16, Rgb(220, 210, 255));

            visuals.EndSceneAndPresent(
                (float)Raylib.GetTime(),
                Math.Clamp(damageFlash / 0.25f, 0f, 1f));
        }

        Raylib.CloseAudioDevice();
        Raylib.CloseWindow();
        return 0;
    }

    // ─── Math / helpers ──────────────────────────────────────────────
    static Color Rgb(int r, int g, int b) => new((byte)r, (byte)g, (byte)b, (byte)255);
    static Color Rgba(int r, int g, int b, int a) => new((byte)r, (byte)g, (byte)b, (byte)a);

    static Vector3 LookDir(float yaw, float pitch) => new(
        -MathF.Sin(yaw) * MathF.Cos(pitch),
        MathF.Sin(pitch),
        -MathF.Cos(yaw) * MathF.Cos(pitch));

    static Vector3 RotY(Vector3 v, float yaw)
    {
        float c = MathF.Cos(yaw), s = MathF.Sin(yaw);
        return new Vector3(v.X * c + v.Z * s, v.Y, -v.X * s + v.Z * c);
    }

    static void StartGame(
        ref Phase phase, ref int hp, ref int mag, ref int reserve, ref int wave, ref int kills, ref int score,
        ref float yaw, ref float pitch, ref float velY, ref Camera3D cam, List<Zombie> zombies,
        List<Particle> particles, ref float spawnTimer, ref int waveSpawned, ref int waveTarget,
        ref float fireCd, ref bool reloading, ref float reloadT, ref float invuln)
    {
        phase = Phase.Playing;
        hp = 100; mag = MagSize; reserve = ReserveStart;
        wave = 1; kills = 0; score = 0;
        yaw = 0; pitch = 0; velY = 0;
        cam.Position = new Vector3(0, PlayerHeight, 6);
        cam.Target = new Vector3(0, PlayerHeight, 5);
        zombies.Clear(); particles.Clear();
        waveSpawned = 0; waveTarget = 6; spawnTimer = 0.5f;
        fireCd = 0; reloading = false; reloadT = 0; invuln = 0;
        // gun aim re-inited by first frame LookDir
    }

    static void StartReload(ref bool reloading, ref float reloadT, int mag, int reserve)
    {
        if (reloading || mag == MagSize || reserve <= 0) return;
        reloading = true;
        reloadT = ReloadTime;
    }

    /// <summary>
    /// Auto-aim target: Rust <c>notd_pick_target</c> when loaded, else C# scan.
    /// </summary>
    static Zombie? FindAutoTarget(Vector3 camPos, Vector3 lookDir, List<Zombie> zombies)
    {
        lookDir = Vector3.Normalize(lookDir);
        if (NativeSim.Available && zombies.Count > 0)
        {
            var arr = ToNative(zombies);
            int idx = NativeSim.notd_pick_target(
                arr, arr.Length,
                camPos.X, camPos.Y, camPos.Z,
                lookDir.X, lookDir.Y, lookDir.Z);
            if (idx >= 0 && idx < zombies.Count && !zombies[idx].Dead)
                return zombies[idx];
        }

        Zombie? best = null;
        float bestScore = float.MaxValue;
        foreach (var z in zombies)
        {
            if (z.Dead) continue;
            var chest = z.Pos + new Vector3(0, 1.4f, 0);
            var to = chest - camPos;
            float dist = to.Length();
            if (dist < 0.8f || dist > 55f) continue;
            to /= dist;
            float facing = Vector3.Dot(lookDir, to);
            if (facing < 0.05f) continue;
            float score = dist * 0.35f + (1f - facing) * 25f;
            if (score < bestScore)
            {
                bestScore = score;
                best = z;
            }
        }
        return best;
    }

    static NativeSim.NativeZombie[] ToNative(List<Zombie> zombies)
    {
        var arr = new NativeSim.NativeZombie[zombies.Count];
        for (int i = 0; i < zombies.Count; i++)
        {
            var z = zombies[i];
            arr[i] = new NativeSim.NativeZombie
            {
                X = z.Pos.X, Y = z.Pos.Y, Z = z.Pos.Z,
                Hp = z.Hp, MaxHp = z.MaxHp, Speed = z.Speed,
                AttackCd = z.AttackCd, Bob = z.Bob, DieT = z.DieT, Yaw = z.Yaw,
                Dead = z.Dead ? 1 : 0,
                Variant = z.Variant
            };
        }
        return arr;
    }

    static void FromNative(List<Zombie> zombies, NativeSim.NativeZombie[] arr)
    {
        for (int i = 0; i < zombies.Count && i < arr.Length; i++)
        {
            var n = arr[i];
            var z = zombies[i];
            z.Pos = new Vector3(n.X, n.Y, n.Z);
            z.Hp = n.Hp; z.MaxHp = n.MaxHp; z.Speed = n.Speed;
            z.AttackCd = n.AttackCd; z.Bob = n.Bob; z.DieT = n.DieT; z.Yaw = n.Yaw;
            z.Dead = n.Dead != 0; z.Variant = n.Variant;
        }
        // Purge fully faded corpses (Rust sets die_t countdown)
        for (int i = zombies.Count - 1; i >= 0; i--)
        {
            if (zombies[i].Dead && zombies[i].DieT <= 0)
                zombies.RemoveAt(i);
        }
    }

    /// <summary>Rust-driven zombie chase / attack (falls back only if DllImport fails mid-run).</summary>
    static void UpdateZombiesRust(
        List<Zombie> zombies, Vector3 playerPos, float dt,
        ref int hp, ref float invuln, ref float damageFlash, int wave)
    {
        if (zombies.Count == 0) return;
        var arr = ToNative(zombies);
        float dmg = 0f;
        try
        {
            NativeSim.notd_update_zombies(
                arr, arr.Length,
                playerPos.X, playerPos.Y, playerPos.Z,
                dt, wave, out dmg);
        }
        catch
        {
            UpdateZombies(zombies, playerPos, dt, ref hp, ref invuln, ref damageFlash, wave);
            return;
        }
        FromNative(zombies, arr);
        if (dmg > 0 && invuln <= 0)
        {
            hp = Math.Max(0, hp - (int)dmg);
            invuln = 0.55f;
            damageFlash = 0.25f;
        }
    }

    /// <summary>
    /// Auto-fire: while held, shoots on cooldown. Bullets track the locked target
    /// (hitscan to head/chest) so you don't need pixel-perfect aim.
    /// </summary>
    static void TryShootAuto(
        ref float fireCd, ref int mag, ref int reserve, ref bool reloading, ref float reloadT,
        ref float muzzleFlash, ref float gunRecoil,
        Vector3 origin, Vector3 gunAim, Zombie? locked,
        List<Zombie> zombies, List<Particle> particles,
        ref int kills, ref int score, Random rng)
    {
        if (reloading || fireCd > 0) return;
        if (mag <= 0) { StartReload(ref reloading, ref reloadT, mag, reserve); return; }
        mag--;
        fireCd = FireCooldown * 0.85f; // slightly faster for auto
        muzzleFlash = 0.1f;
        gunRecoil = 1f;

        // Prefer locked target — guaranteed track to body/head
        Zombie? hitZ = null;
        Vector3 hitPos = origin + gunAim * 40f;
        bool headshot = false;
        Vector3 dir = Vector3.Normalize(gunAim);

        if (locked != null && !locked.Dead)
        {
            // Snap shot at head or chest of locked enemy (auto aim fire)
            headshot = rng.NextDouble() < 0.35; // some headshots for juice
            hitPos = locked.Pos + new Vector3(0, headshot ? 1.78f : 1.2f, 0);
            dir = Vector3.Normalize(hitPos - origin);
            hitZ = locked;
        }
        else
        {
            // No lock: fire along gun aim, generous hit spheres
            float bestT = float.MaxValue;
            foreach (var z in zombies)
            {
                if (z.Dead) continue;
                if (RaySphere(origin, dir, z.Pos + new Vector3(0, 1.2f, 0), 0.75f, out float tB) && tB > 0 && tB < bestT)
                { bestT = tB; hitZ = z; headshot = false; hitPos = origin + dir * tB; }
                if (RaySphere(origin, dir, z.Pos + new Vector3(0, 1.78f, 0), 0.4f, out float tH) && tH > 0 && tH < bestT)
                { bestT = tH; hitZ = z; headshot = true; hitPos = origin + dir * tH; }
            }
        }

        // Muzzle sparks toward impact
        for (int i = 0; i < 4; i++)
        {
            particles.Add(new Particle
            {
                Pos = origin + dir * (0.6f + i * 0.08f),
                Vel = dir * (8f + i * 2f) + new Vector3(
                    (float)(rng.NextDouble() - 0.5) * 2f,
                    (float)(rng.NextDouble() - 0.5) * 2f,
                    (float)(rng.NextDouble() - 0.5) * 2f),
                Life = 0.08f + i * 0.02f,
                Color = Rgba(255, 220, 100, 220),
                Size = 0.03f
            });
        }

        if (hitZ != null)
        {
            float dmg = BulletDamage * (headshot ? HeadshotMul : 1f) * 1.1f;
            hitZ.Hp -= dmg;
            SpawnBlood(particles, hitPos, headshot ? 18 : 10, rng);
            var away = hitZ.Pos - origin; away.Y = 0;
            if (away.LengthSquared() > 0.001f)
                hitZ.Pos += Vector3.Normalize(away) * -0.45f;
            if (hitZ.Hp <= 0)
            {
                hitZ.Dead = true;
                hitZ.DieT = 1.0f;
                kills++;
                score += headshot ? 150 : 100;
                SpawnBlood(particles, hitZ.Pos + new Vector3(0, 1.4f, 0), headshot ? 24 : 14, rng);
            }
        }
    }

    static bool RaySphere(Vector3 origin, Vector3 dir, Vector3 center, float radius, out float t)
    {
        var oc = origin - center;
        float b = Vector3.Dot(oc, dir);
        float c = Vector3.Dot(oc, oc) - radius * radius;
        float h = b * b - c;
        if (h < 0) { t = 0; return false; }
        h = MathF.Sqrt(h);
        t = -b - h;
        if (t < 0) t = -b + h;
        return t >= 0;
    }

    static void SpawnBlood(List<Particle> particles, Vector3 pos, int n, Random rng)
    {
        for (int i = 0; i < n; i++)
        {
            particles.Add(new Particle
            {
                Pos = pos,
                Vel = new Vector3(
                    (float)(rng.NextDouble() - 0.5) * 7f,
                    2f + (float)rng.NextDouble() * 6f,
                    (float)(rng.NextDouble() - 0.5) * 7f),
                Life = 0.45f + (float)rng.NextDouble() * 0.55f,
                Color = Rgba(150 + rng.Next(40), 8, 12, 230),
                Size = 0.035f + (float)rng.NextDouble() * 0.06f
            });
        }
    }

    static void UpdateParticles(List<Particle> particles, float dt)
    {
        for (int i = particles.Count - 1; i >= 0; i--)
        {
            var p = particles[i];
            p.Life -= dt;
            p.Vel.Y -= 14f * dt;
            p.Pos += p.Vel * dt;
            p.Size *= 0.985f;
            if (p.Life <= 0 || p.Pos.Y < 0.02f) particles.RemoveAt(i);
            else particles[i] = p;
        }
    }

    static void UpdateZombies(
        List<Zombie> zombies, Vector3 playerPos, float dt,
        ref int hp, ref float invuln, ref float damageFlash, int wave)
    {
        for (int i = zombies.Count - 1; i >= 0; i--)
        {
            var z = zombies[i];
            if (z.Dead)
            {
                z.DieT -= dt;
                z.Pos.Y -= dt * 0.9f;
                if (z.DieT <= 0) { zombies.RemoveAt(i); continue; }
                continue;
            }

            var to = playerPos - z.Pos; to.Y = 0;
            float dist = MathF.Max(0.001f, to.Length());
            var dir = to / dist;
            z.Yaw = MathF.Atan2(dir.X, dir.Z);

            if (dist > 1.25f)
            {
                z.Pos += dir * z.Speed * dt;
                float half = ArenaSize - 1f;
                z.Pos.X = Math.Clamp(z.Pos.X, -half, half);
                z.Pos.Z = Math.Clamp(z.Pos.Z, -half, half);
                foreach (var o in zombies)
                {
                    if (ReferenceEquals(o, z) || o.Dead) continue;
                    var d = z.Pos - o.Pos; d.Y = 0;
                    float sd = d.Length();
                    if (sd < 0.95f && sd > 0.001f) z.Pos += (d / sd) * 4.5f * dt;
                }
                z.Bob += dt * 9f;
            }
            else
            {
                z.AttackCd -= dt;
                if (z.AttackCd <= 0)
                {
                    if (invuln <= 0)
                    {
                        hp = Math.Max(0, hp - (int)(12 + wave * 1.5f));
                        invuln = 0.55f;
                        damageFlash = 0.25f;
                    }
                    z.AttackCd = 0.85f;
                }
            }
        }
    }

    static void UpdateWaves(
        List<Zombie> zombies, ref int wave, ref int waveSpawned, ref int waveTarget,
        ref float spawnTimer, ref int reserve, float dt, Random rng)
    {
        int alive = 0;
        foreach (var z in zombies) if (!z.Dead) alive++;

        if (waveSpawned < waveTarget && alive < MaxZombies)
        {
            spawnTimer -= dt;
            if (spawnTimer <= 0)
            {
                float ang = (float)(rng.NextDouble() * Math.PI * 2);
                float r = ArenaSize * 0.85f;
                var z = new Zombie
                {
                    Pos = new Vector3(MathF.Cos(ang) * r, 0, MathF.Sin(ang) * r),
                    MaxHp = 90 + wave * 18,
                    Speed = 2.15f + wave * 0.18f + (float)rng.NextDouble() * 0.55f,
                    Variant = rng.Next(0, 3),
                    Bob = (float)rng.NextDouble() * MathF.PI * 2
                };
                z.Hp = z.MaxHp;
                zombies.Add(z);
                waveSpawned++;
                spawnTimer = Math.Max(0.32f, 1.35f - wave * 0.08f);
            }
        }
        else if (waveSpawned >= waveTarget && alive == 0)
        {
            wave++;
            waveSpawned = 0;
            waveTarget = Math.Min(6 + (wave - 1) * 3, MaxZombies);
            spawnTimer = 0.45f;
            reserve = Math.Min(reserve + 12 + wave * 2, 120);
        }
    }

    static void TryMove(ref Camera3D cam, float dx, float dz, List<Prop> props)
    {
        float half = ArenaSize - 1.2f;
        float nx = Math.Clamp(cam.Position.X + dx, -half, half);
        float nz = Math.Clamp(cam.Position.Z + dz, -half, half);

        foreach (var p in props)
        {
            if (!p.Collide) continue;
            float hw = p.Size.X * 0.5f + PlayerRadius;
            float hd = p.Size.Z * 0.5f + PlayerRadius;
            if (MathF.Abs(nx - p.Pos.X) < hw && MathF.Abs(nz - p.Pos.Z) < hd)
            {
                if (MathF.Abs(cam.Position.X - p.Pos.X) >= hw) nx = cam.Position.X;
                if (MathF.Abs(cam.Position.Z - p.Pos.Z) >= hd) nz = cam.Position.Z;
            }
        }
        cam.Position.X = nx;
        cam.Position.Z = nz;
    }

    // ─── World build ─────────────────────────────────────────────────
    static List<Prop> BuildProps()
    {
        var list = new List<Prop>();
        var rng = new Random(11);
        float a = ArenaSize, h = 5f, t = 1.4f;

        // Boundary walls (thicker, darker)
        list.Add(Wall(new Vector3(0, h / 2, -a), new Vector3(a * 2 + t, h, t)));
        list.Add(Wall(new Vector3(0, h / 2, a), new Vector3(a * 2 + t, h, t)));
        list.Add(Wall(new Vector3(-a, h / 2, 0), new Vector3(t, h, a * 2)));
        list.Add(Wall(new Vector3(a, h / 2, 0), new Vector3(t, h, a * 2)));

        for (int i = 0; i < 22; i++)
        {
            float bx = (float)(rng.NextDouble() - 0.5) * ArenaSize * 1.65f;
            float bz = (float)(rng.NextDouble() - 0.5) * ArenaSize * 1.65f;
            if (MathF.Sqrt(bx * bx + bz * bz) < 7) continue;
            float bw = 2.2f + (float)rng.NextDouble() * 4.5f;
            float bh = 2.4f + (float)rng.NextDouble() * 5.5f;
            float bd = 2.2f + (float)rng.NextDouble() * 4.5f;
            int shade = rng.Next(0, 35);
            list.Add(new Prop
            {
                Pos = new Vector3(bx, bh / 2, bz),
                Size = new Vector3(bw, bh, bd),
                Color = Rgb(140 + shade, 135 + shade / 2, 150 + shade), // readable brick tint
                RoofColor = Rgb(90, 85, 100),
                Windows = rng.NextDouble() > 0.35,
                Collide = true
            });
        }

        // Graves (no collision)
        for (int i = 0; i < 28; i++)
        {
            float gx = (float)(rng.NextDouble() - 0.5) * ArenaSize * 1.7f;
            float gz = (float)(rng.NextDouble() - 0.5) * ArenaSize * 1.7f;
            if (MathF.Sqrt(gx * gx + gz * gz) < 5) continue;
            list.Add(new Prop
            {
                Pos = new Vector3(gx, 0.55f, gz),
                Size = new Vector3(0.28f, 1.1f, 0.12f),
                Color = Rgb(70, 68, 62),
                Collide = false
            });
        }
        return list;
    }

    static Prop Wall(Vector3 pos, Vector3 size) => new()
    {
        Pos = pos, Size = size, Color = Rgb(110, 110, 130), Collide = true
    };

    // ─── Drawing ─────────────────────────────────────────────────────
    static void DrawSkyDome(Vector3 camPos)
    {
        // Lighter horizon cards so sky isn't a black hole
        for (int i = 0; i < 16; i++)
        {
            float ang = i / 16f * MathF.PI * 2;
            float r = 95f;
            Raylib.DrawCube(
                camPos + new Vector3(MathF.Cos(ang) * r, 14f, MathF.Sin(ang) * r),
                24f, 44f, 24f,
                ColSkyBot);
        }
        var moon = new Vector3(-55, 70, -70);
        Raylib.DrawSphere(moon, 7f, Rgb(255, 250, 230));
        Raylib.DrawSphere(moon, 11f, Rgba(210, 220, 255, 40));
        Raylib.DrawSphere(moon, 18f, Rgba(170, 180, 230, 22));
    }

    static void DrawWorld(List<Prop> props, Vector3 camPos, VisualAssets vis)
    {
        // Ground — Python-baked asphalt texture (scaled cube slab)
        if (vis.TexturesReady)
        {
            // Bright tints — textures alone were nearly black under post
            vis.DrawBox(vis.MGround, new Vector3(0, -0.04f, 0),
                new Vector3(ArenaSize * 2.2f, 0.1f, ArenaSize * 2.2f), Rgb(200, 210, 190));
            vis.DrawBox(vis.MGround, new Vector3(0, -0.12f, 0),
                new Vector3(ArenaSize * 2.5f, 0.08f, ArenaSize * 2.5f), Rgb(160, 165, 150));
        }
        else
        {
            Raylib.DrawPlane(Vector3.Zero, new Vector2(ArenaSize * 2.2f, ArenaSize * 2.2f), ColGround);
            Raylib.DrawCube(new Vector3(0, -0.05f, 0), ArenaSize * 2.4f, 0.08f, ArenaSize * 2.4f, ColGround2);
        }
        Raylib.DrawGrid((int)ArenaSize, 2f);

        foreach (var p in props)
        {
            var model = p.Collide && p.Size.Y > 1.5f ? vis.MBrick : vis.MConcrete;
            if (!p.Collide) model = vis.MConcrete;
            if (p.Collide && p.Size.Y > 4.5f && p.Size.X > ArenaSize) model = vis.MConcrete; // walls

            if (vis.TexturesReady)
                vis.DrawBox(model, p.Pos, p.Size, p.Color);
            else
                Raylib.DrawCube(p.Pos, p.Size.X, p.Size.Y, p.Size.Z, p.Color);

            Raylib.DrawCubeWires(p.Pos, p.Size.X, p.Size.Y, p.Size.Z, ColWallDark);

            if (p.RoofColor.HasValue && p.Size.Y > 1.5f)
            {
                var roof = p.Pos + new Vector3(0, p.Size.Y * 0.5f + 0.12f, 0);
                if (vis.TexturesReady)
                    vis.DrawBox(vis.MMetal, roof, new Vector3(p.Size.X + 0.45f, 0.28f, p.Size.Z + 0.45f), p.RoofColor.Value);
                else
                    Raylib.DrawCube(roof, p.Size.X + 0.45f, 0.28f, p.Size.Z + 0.45f, p.RoofColor.Value);
            }

            if (p.Windows && p.Collide && p.Size.Y > 2.5f)
            {
                float wy = p.Pos.Y + p.Size.Y * 0.15f;
                for (int w = 0; w < 2; w++)
                {
                    float ox = (w - 0.5f) * p.Size.X * 0.28f;
                    var wp = p.Pos + new Vector3(ox, wy - p.Pos.Y * 0.1f, p.Size.Z * 0.51f);
                    Raylib.DrawCube(wp, 0.35f, 0.45f, 0.08f, Rgb(255, 170, 70));
                    Raylib.DrawCube(wp + new Vector3(0, 0, 0.1f), 0.55f, 0.65f, 0.05f, Rgba(255, 160, 50, 35));
                }
            }
        }

        // Street lamps + soft glow billboards (Python glow texture)
        for (int i = 0; i < 6; i++)
        {
            float ang = i / 6f * MathF.PI * 2;
            float lx = MathF.Cos(ang) * 18f;
            float lz = MathF.Sin(ang) * 18f;
            if (vis.TexturesReady)
                vis.DrawBox(vis.MMetal, new Vector3(lx, 2.6f, lz), new Vector3(0.18f, 5.2f, 0.18f), Rgb(28, 28, 34));
            else
                Raylib.DrawCylinder(new Vector3(lx, 0, lz), 0.1f, 0.14f, 5.2f, 10, Rgb(28, 28, 34));

            Raylib.DrawSphere(new Vector3(lx, 5.25f, lz), 0.32f, ColLamp);
            Raylib.DrawSphere(new Vector3(lx, 5.25f, lz), 1.8f, ColLampGlow);
            Raylib.DrawSphere(new Vector3(lx, 5.25f, lz), 3.5f, Rgba(255, 150, 40, 18));
            Raylib.DrawCylinder(new Vector3(lx, 0.03f, lz), 3.2f, 3.2f, 0.04f, 16, Rgba(255, 160, 60, 28));

            // Soft lamp cookie (Python glow.png) as vertical sprite via cube faces is enough;
            // billboard needs live camera — use emissive spheres above.
        }

        for (int i = 0; i < 8; i++)
        {
            float ang = i / 8f * MathF.PI * 2 + 0.2f;
            float r = ArenaSize * 0.95f;
            var pos = new Vector3(MathF.Cos(ang) * r, 6f, MathF.Sin(ang) * r);
            if (vis.TexturesReady)
                vis.DrawBox(vis.MConcrete, pos, new Vector3(2f, 14f, 2f), Rgba(50, 45, 70, 140));
            else
                Raylib.DrawCube(pos, 2f, 14f, 2f, Rgba(50, 45, 70, 140));
        }
    }

    static void DrawZombie(Zombie z, VisualAssets vis)
    {
        float alpha = z.Dead ? Math.Clamp(z.DieT, 0, 1) : 1f;
        byte a = (byte)(alpha * 255);
        Color skin = new((byte)72, (byte)(98 - z.Variant * 8), (byte)(52 + z.Variant * 6), a);
        Color skinD = new((byte)48, (byte)68, (byte)36, a);
        Color shirt = new((byte)(50 + z.Variant * 10), (byte)40, (byte)(46 + z.Variant * 5), a);
        Color pants = new((byte)32, (byte)36, (byte)(48 + z.Variant * 4), a);
        Color eye = new((byte)255, (byte)30, (byte)30, a);
        Color eyeGlow = new((byte)255, (byte)40, (byte)40, (byte)(a / 4));

        float bob = z.Dead ? 0 : MathF.Abs(MathF.Sin(z.Bob)) * 0.06f;
        float lean = z.Dead ? 0.9f * (1 - alpha) : 0.12f;
        var origin = z.Pos + new Vector3(0, bob, 0);

        void Part(Vector3 local, Vector3 size, Color col, bool useSkin = false)
        {
            var p = origin + RotY(local, z.Yaw);
            p += RotY(new Vector3(0, 0, local.Y * lean * 0.15f), z.Yaw);
            if (vis.TexturesReady && useSkin)
                vis.DrawBox(vis.MSkin, p, size, col);
            else if (vis.TexturesReady && !useSkin)
                vis.DrawBox(vis.MMetal, p, size, col);
            else
                Raylib.DrawCube(p, size.X, size.Y, size.Z, col);
        }

        float leg = z.Dead ? 0 : MathF.Sin(z.Bob) * 0.18f;
        float arm = z.Dead ? 0 : MathF.Sin(z.Bob + 1f) * 0.1f;

        // Legs / clothes (metal tint as cloth proxy) + skin head/arms (Python zombie_skin.png)
        Part(new Vector3(-0.16f, 0.42f + leg * 0.5f, 0.02f), new Vector3(0.18f, 0.72f, 0.18f), pants, false);
        Part(new Vector3(0.16f, 0.42f - leg * 0.5f, 0.02f), new Vector3(0.18f, 0.72f, 0.18f), pants, false);
        Part(new Vector3(0, 1.18f, 0.05f), new Vector3(0.58f, 0.78f, 0.34f), shirt, false);
        Part(new Vector3(0, 1.52f, 0.05f), new Vector3(0.72f, 0.22f, 0.3f), shirt, false);
        Part(new Vector3(0, 1.82f, 0.08f), new Vector3(0.34f, 0.38f, 0.34f), skin, true);
        Part(new Vector3(0, 1.62f, 0.18f), new Vector3(0.22f, 0.1f, 0.14f), skinD, true);
        Part(new Vector3(-0.09f, 1.86f, 0.24f), new Vector3(0.07f, 0.06f, 0.06f), eye, false);
        Part(new Vector3(0.09f, 1.86f, 0.24f), new Vector3(0.07f, 0.06f, 0.06f), eye, false);
        var eyeCenter = origin + RotY(new Vector3(0, 1.86f, 0.3f), z.Yaw);
        Raylib.DrawSphere(eyeCenter, 0.28f, eyeGlow);
        Part(new Vector3(-0.48f, 1.35f + arm, 0.28f), new Vector3(0.14f, 0.18f, 0.62f), skin, true);
        Part(new Vector3(0.48f, 1.35f - arm, 0.28f), new Vector3(0.14f, 0.18f, 0.62f), skin, true);
        Part(new Vector3(-0.48f, 1.35f + arm, 0.62f), new Vector3(0.14f, 0.14f, 0.14f), skinD, true);
        Part(new Vector3(0.48f, 1.35f - arm, 0.62f), new Vector3(0.14f, 0.14f, 0.14f), skinD, true);

        if (!z.Dead && z.Hp < z.MaxHp)
        {
            float pct = Math.Clamp(z.Hp / z.MaxHp, 0, 1);
            var bar = origin + new Vector3(0, 2.25f, 0);
            Raylib.DrawCube(bar, 0.7f, 0.07f, 0.07f, new Color((byte)40, (byte)0, (byte)0, a));
            Raylib.DrawCube(bar + new Vector3((pct - 1f) * 0.35f, 0, 0), 0.7f * pct, 0.07f, 0.07f,
                new Color((byte)220, (byte)40, (byte)40, a));
        }
    }

    /// <summary>
    /// 3D viewmodel aimed along smoothed auto-aim direction, with idle/fire animation.
    /// </summary>
    static void DrawViewGun3D(
        Camera3D cam, Vector3 aimDir,
        float muzzleFlash, float walkBob, bool reloading, float gunRecoil, float animT, bool hasLock)
    {
        if (aimDir.LengthSquared() < 0.01f) aimDir = new Vector3(0, 0, -1);
        aimDir = Vector3.Normalize(aimDir);

        var forward = aimDir;
        var right = Vector3.Cross(forward, Vector3.UnitY);
        if (right.LengthSquared() < 1e-6f)
            right = Vector3.Cross(forward, Vector3.UnitX);
        right = Vector3.Normalize(right);
        var up = Vector3.Normalize(Vector3.Cross(right, forward));

        // Animation
        float kick = gunRecoil * 0.09f + (muzzleFlash > 0 ? 0.04f : 0f);
        float swayX = MathF.Sin(walkBob) * 0.016f + MathF.Sin(animT * 1.7f) * 0.006f;
        float swayY = MathF.Abs(MathF.Sin(walkBob * 0.9f)) * 0.012f + MathF.Sin(animT * 2.3f) * 0.004f;
        float dip = reloading ? 0.14f + MathF.Sin(animT * 14f) * 0.02f : 0f;
        // When locked, slight upward bias / ready pose
        float ready = hasLock ? 0.02f : 0f;

        var root = cam.Position
            + forward * (0.40f - kick)
            + right * (0.23f + swayX)
            + up * (-0.20f - dip + swayY + ready);

        // Recoil kicks barrel up slightly
        if (gunRecoil > 0.01f)
        {
            forward = Vector3.Normalize(forward + up * (gunRecoil * 0.12f));
            right = Vector3.Normalize(Vector3.Cross(forward, Vector3.UnitY));
            if (right.LengthSquared() < 1e-6f) right = Vector3.UnitX;
            up = Vector3.Normalize(Vector3.Cross(right, forward));
        }

        Vector3 L(float f, float r, float u) => root + forward * f + right * r + up * u;

        Color metal = hasLock ? Rgb(48, 52, 64) : Rgb(38, 40, 48);
        Color metalHi = Rgb(70, 74, 88);
        Color barrelC = Rgb(28, 30, 36);
        Color grip = Rgb(90, 58, 36);
        Color gripDark = Rgb(55, 35, 20);

        // Receiver
        Raylib.DrawCylinderEx(L(-0.06f, 0, 0.01f), L(0.16f, 0, 0.02f), 0.034f, 0.04f, 12, metal);
        Raylib.DrawCylinderEx(L(-0.04f, 0, 0.038f), L(0.12f, 0, 0.042f), 0.014f, 0.016f, 8, metalHi);

        // Slide kick anim on recoil
        float slide = gunRecoil * 0.04f;
        Raylib.DrawCylinderEx(L(-0.02f - slide, 0, 0.04f), L(0.1f - slide, 0, 0.04f), 0.01f, 0.01f, 6, Rgb(90, 95, 110));

        // Barrel → points at auto-aim target
        Raylib.DrawCylinderEx(L(0.14f, 0, 0.02f), L(0.42f, 0, 0.02f), 0.015f, 0.017f, 12, barrelC);
        Raylib.DrawCylinderEx(L(0.40f, 0, 0.02f), L(0.46f, 0, 0.02f), 0.02f, 0.012f, 8, metalHi);

        // Rail / grip / mag
        Raylib.DrawCylinderEx(L(0.08f, 0, -0.015f), L(0.28f, 0, -0.015f), 0.008f, 0.008f, 6, Rgb(50, 52, 58));
        Raylib.DrawCylinderEx(L(-0.02f, 0, -0.01f), L(-0.07f, 0.015f, -0.16f), 0.03f, 0.034f, 8, grip);
        Raylib.DrawSphere(L(-0.07f, 0.015f, -0.17f), 0.032f, gripDark);
        Raylib.DrawCylinderEx(L(0.03f, 0, -0.02f), L(0.03f, 0, -0.13f), 0.02f, 0.022f, 6, Rgb(30, 30, 36));

        // Trigger guard
        Raylib.DrawCylinderEx(L(0.0f, 0, -0.02f), L(0.06f, 0, -0.02f), 0.006f, 0.006f, 6, metalHi);
        Raylib.DrawCylinderEx(L(0.06f, 0, -0.02f), L(0.06f, 0, -0.08f), 0.006f, 0.006f, 6, metalHi);
        Raylib.DrawCylinderEx(L(0.06f, 0, -0.08f), L(0.0f, 0, -0.08f), 0.006f, 0.006f, 6, metalHi);

        // Sights (glow red when locked)
        Raylib.DrawSphere(L(0.02f, 0, 0.055f), 0.012f, metalHi);
        Raylib.DrawSphere(L(0.32f, 0, 0.05f), 0.012f, hasLock ? ColUiRed : metalHi);
        Raylib.DrawSphere(L(-0.04f, 0.02f, -0.08f), 0.04f, Rgb(100, 78, 60));

        // Lock laser / beam when tracking
        if (hasLock)
        {
            Raylib.DrawCylinderEx(L(0.46f, 0, 0.02f), L(2.5f, 0, 0.02f), 0.004f, 0.002f, 6, Rgba(255, 60, 60, 90));
        }

        if (muzzleFlash > 0)
        {
            float t = muzzleFlash / 0.1f;
            var tip = L(0.48f, 0, 0.02f);
            byte a = (byte)(t * 240);
            Raylib.DrawSphere(tip, 0.07f * t + 0.035f, new Color((byte)255, (byte)240, (byte)160, a));
            Raylib.DrawSphere(tip + forward * 0.05f, 0.12f * t + 0.04f, new Color((byte)255, (byte)150, (byte)40, (byte)(a / 2)));
            Raylib.DrawCylinderEx(tip, tip + forward * (0.14f * t + 0.05f), 0.06f * t, 0.002f, 8,
                new Color((byte)255, (byte)200, (byte)80, (byte)(a / 2)));
        }
    }

    static void DrawTargetLock(Camera3D cam, Zombie z)
    {
        var world = z.Pos + new Vector3(0, 1.55f, 0);
        Vector2 sp = Raylib.GetWorldToScreen(world, cam);
        if (sp.X < 8 || sp.X > ScreenW - 8 || sp.Y < 8 || sp.Y > ScreenH - 8) return;
        int x = (int)sp.X, y = (int)sp.Y;
        Color c = Rgba(255, 70, 70, 220);
        // Corner brackets
        int s = 18;
        Raylib.DrawLine(x - s, y - s, x - s + 8, y - s, c);
        Raylib.DrawLine(x - s, y - s, x - s, y - s + 8, c);
        Raylib.DrawLine(x + s, y - s, x + s - 8, y - s, c);
        Raylib.DrawLine(x + s, y - s, x + s, y - s + 8, c);
        Raylib.DrawLine(x - s, y + s, x - s + 8, y + s, c);
        Raylib.DrawLine(x - s, y + s, x - s, y + s - 8, c);
        Raylib.DrawLine(x + s, y + s, x + s - 8, y + s, c);
        Raylib.DrawLine(x + s, y + s, x + s, y + s - 8, c);
        Raylib.DrawText("LOCK", x - 16, y - s - 16, 14, c);
        // HP under lock
        float pct = Math.Clamp(z.Hp / z.MaxHp, 0, 1);
        Raylib.DrawRectangle(x - 20, y + s + 4, 40, 4, Rgba(40, 0, 0, 200));
        Raylib.DrawRectangle(x - 20, y + s + 4, (int)(40 * pct), 4, ColUiRed);
    }

    static void DrawVignette(float strength)
    {
        // Very soft edge darken only (was crushing the whole frame)
        strength = Math.Clamp(strength * 0.35f, 0f, 0.25f);
        int steps = 6;
        for (int i = 0; i < steps; i++)
        {
            float t = (i + 1f) / steps;
            byte a = (byte)(strength * t * t * 120);
            int m = (int)(t * 50);
            Raylib.DrawRectangleLinesEx(
                new Rectangle(m, m, ScreenW - m * 2, ScreenH - m * 2),
                8,
                Rgba(0, 0, 0, a));
        }
    }

    static void DrawHud(int hp, int mag, int reserve, int wave, int kills, int score,
        bool reloading, float muzzleFlash, float damageFlash, Zombie? locked, Camera3D cam)
    {
        if (damageFlash > 0)
        {
            byte a = (byte)(damageFlash / 0.25f * 100);
            Raylib.DrawRectangle(0, 0, ScreenW, ScreenH, Rgba(160, 0, 0, a));
        }

        Raylib.DrawRectangleGradientV(0, 0, ScreenW, 70, Rgba(0, 0, 0, 160), Rgba(0, 0, 0, 0));

        Raylib.DrawText("HP", 20, 16, 18, ColUiMuted);
        Raylib.DrawRectangle(54, 18, 160, 14, Rgba(40, 15, 15, 220));
        Raylib.DrawRectangle(54, 18, (int)(160 * (hp / 100f)), 14, ColUiRed);
        Raylib.DrawRectangleLinesEx(new Rectangle(54, 18, 160, 14), 1, Rgba(239, 68, 68, 120));
        Raylib.DrawText(hp.ToString(), 224, 16, 18, Color.White);

        DrawCentered($"WAVE {wave}", ScreenW / 2, 12, 22, Color.White);
        DrawCentered($"Kills {kills}", ScreenW / 2, 36, 16, ColUiMuted);
        DrawCentered($"Score {score}", ScreenW / 2, 54, 16, ColUiGold);

        string ammo = reloading ? "RELOADING…" : $"{mag} / {reserve}";
        int aw = Raylib.MeasureText(ammo, 24);
        Raylib.DrawText(ammo, ScreenW - aw - 24, 18, 24, ColUiGold);

        // Auto-aim status
        string aimTxt = locked != null && !locked.Dead ? "◆ AUTO-LOCK" : "◇ seeking…";
        Color aimCol = locked != null && !locked.Dead ? ColUiRed : ColUiMuted;
        int atw = Raylib.MeasureText(aimTxt, 18);
        Raylib.DrawText(aimTxt, ScreenW - atw - 24, 48, 18, aimCol);

        int cx = ScreenW / 2, cy = ScreenH / 2;
        Color ch = locked != null ? Rgba(255, 90, 90, 230) : Rgba(255, 255, 255, 210);
        Raylib.DrawCircleLines(cx, cy, 11, ch);
        Raylib.DrawCircleLines(cx, cy, 12, Rgba(239, 68, 68, 80));
        Raylib.DrawLine(cx - 16, cy, cx - 6, cy, ch);
        Raylib.DrawLine(cx + 6, cy, cx + 16, cy, ch);
        Raylib.DrawLine(cx, cy - 16, cx, cy - 6, ch);
        Raylib.DrawLine(cx, cy + 6, cx, cy + 16, ch);
        Raylib.DrawPixel(cx, cy, ColUiRed);

        if (muzzleFlash > 0)
        {
            byte a = (byte)(muzzleFlash / 0.1f * 160);
            Raylib.DrawCircle(cx + 40, cy + 90, 36, Rgba(255, 210, 100, a));
        }

        Raylib.DrawText("WASD move · hold LMB auto-fire · R reload · Space jump · Esc free mouse",
            16, ScreenH - 28, 15, Rgba(200, 200, 215, 180));
        _ = cam;
    }

    static void DrawCentered(string text, int cx, int y, int size, Color col)
    {
        int tw = Raylib.MeasureText(text, size);
        Raylib.DrawText(text, cx - tw / 2, y, size, col);
    }

    static void DrawMenu()
    {
        Raylib.DrawRectangle(0, 0, ScreenW, ScreenH, Rgba(4, 2, 6, 200));
        // radial dark
        for (int i = 8; i >= 1; i--)
            Raylib.DrawCircle(ScreenW / 2, ScreenH / 2, 80 + i * 55, Rgba(40, 0, 0, 8));

        int pw = 480, ph = 400;
        int px = ScreenW / 2 - pw / 2, py = ScreenH / 2 - ph / 2;
        Raylib.DrawRectangle(px, py, pw, ph, Rgba(10, 6, 10, 245));
        Raylib.DrawRectangleLinesEx(new Rectangle(px, py, pw, ph), 2, Rgba(239, 68, 68, 200));
        Raylib.DrawRectangleLinesEx(new Rectangle(px + 4, py + 4, pw - 8, ph - 8), 1, Rgba(120, 40, 40, 100));

        DrawCentered("NIGHT OF THE DEAD", ScreenW / 2, py + 40, 36, Rgb(254, 200, 200));
        DrawCentered("3D ZOMBIE SURVIVAL  ·  NATIVE C# / OPENGL", ScreenW / 2, py + 90, 14, Rgb(167, 139, 250));

        string[] lines =
        [
            "Survive endless waves of the undead",
            "Headshots deal bonus damage",
            "Don't let them surround you"
        ];
        int y = py + 140;
        foreach (var line in lines)
        {
            Raylib.DrawText("▸   " + line, px + 56, y, 18, Rgb(200, 200, 210));
            y += 32;
        }

        int bw = 240, bh = 52;
        int bx = ScreenW / 2 - bw / 2, by = py + 270;
        Raylib.DrawRectangle(bx, by, bw, bh, Rgb(120, 25, 25));
        Raylib.DrawRectangleLinesEx(new Rectangle(bx, by, bw, bh), 2, ColUiRed);
        DrawCentered("ENTER THE NIGHT", ScreenW / 2, by + 16, 20, Color.White);

        DrawCentered("ENTER / CLICK to start   ·   ESC / Q quit", ScreenW / 2, py + 350, 14, Rgba(150, 150, 160, 200));
    }

    static void DrawGameOver(int wave, int kills, int score)
    {
        Raylib.DrawRectangle(0, 0, ScreenW, ScreenH, Rgba(20, 0, 0, 170));
        int pw = 420, ph = 260;
        int px = ScreenW / 2 - pw / 2, py = ScreenH / 2 - ph / 2;
        Raylib.DrawRectangle(px, py, pw, ph, Rgba(10, 6, 10, 250));
        Raylib.DrawRectangleLinesEx(new Rectangle(px, py, pw, ph), 2, Rgba(239, 68, 68, 200));

        DrawCentered("YOU DIED", ScreenW / 2, py + 42, 40, Rgb(254, 200, 200));
        DrawCentered($"Wave {wave}  ·  {kills} kills  ·  {score} score", ScreenW / 2, py + 110, 18, ColUiGold);

        int bw = 220, bh = 48;
        int bx = ScreenW / 2 - bw / 2, by = py + 170;
        Raylib.DrawRectangle(bx, by, bw, bh, Rgb(120, 25, 25));
        Raylib.DrawRectangleLinesEx(new Rectangle(bx, by, bw, bh), 2, ColUiRed);
        DrawCentered("RISE AGAIN", ScreenW / 2, by + 14, 20, Color.White);
    }
}
