#version 330

// Fog + lamp lighting for textured surfaces
in vec2 fragTexCoord;
in vec4 fragColor;
in vec3 fragPos;
in vec3 fragNormal;

uniform sampler2D texture0;
uniform vec3 uCamPos;
uniform vec3 uLamp0;
uniform vec3 uLamp1;
uniform float uTime;
uniform float uFogDensity;

out vec4 finalColor;

void main()
{
    vec4 tex = texture(texture0, fragTexCoord * 2.0);
    vec3 albedo = tex.rgb * fragColor.rgb;

    vec3 N = normalize(fragNormal);
    if (length(fragNormal) < 0.01) N = vec3(0.0, 1.0, 0.0);

    // ambient moonlight
    vec3 lit = albedo * vec3(0.18, 0.20, 0.28);

    // two street lamps
    vec3 lamps[2] = vec3[2](uLamp0, uLamp1);
    for (int i = 0; i < 2; i++)
    {
        vec3 L = lamps[i] - fragPos;
        float dist = length(L);
        L /= max(dist, 0.001);
        float atten = 1.0 / (1.0 + dist * 0.08 + dist * dist * 0.01);
        float ndl = max(dot(N, L), 0.0);
        lit += albedo * vec3(1.0, 0.75, 0.4) * ndl * atten * 1.4;
    }

    // height fog
    float distCam = length(uCamPos - fragPos);
    float fog = 1.0 - exp(-distCam * uFogDensity);
    vec3 fogColor = vec3(0.04, 0.03, 0.07);
    lit = mix(lit, fogColor, clamp(fog, 0.0, 0.85));

    // flicker
    lit *= 0.96 + 0.04 * sin(uTime * 7.0 + fragPos.x);

    finalColor = vec4(lit, tex.a * fragColor.a);
}
