export const PBRDeformVertexShader = `
  uniform float uStrainFactor;
  attribute vec3 aOriginalPosition;
  attribute vec4 aSkinWeights;
  attribute vec4 aSkinIndices;
  
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying float vDamageIntensity;

  void main() {
    vUv = uv;
    vec3 displacedPos = position;
    
    // Evaluate geometric strain against undeformed baseline
    float displacement = length(position - aOriginalPosition);
    vDamageIntensity = clamp(displacement * 2.8, 0.0, 1.0);

    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const PBRDeformFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uMetallic;
  uniform float uRoughness;
  uniform sampler2D uScratchTexture;
  
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying float vDamageIntensity;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(vec3(80.0, 120.0, 60.0) - vWorldPosition);

    // Procedural metal scrape and primer exposure
    vec3 paintColor = uBaseColor;
    vec3 bareMetal = vec3(0.72, 0.73, 0.75);

    // Dynamic scratches reveal bare metal and alter roughness
    vec3 finalAlbedo = mix(paintColor, bareMetal, step(0.35, vDamageIntensity) * 0.85);
    float finalRoughness = mix(uRoughness, 0.85, vDamageIntensity);
    float finalMetallic = mix(uMetallic, 0.95, step(0.35, vDamageIntensity));

    // Simple Blinn-Phong/GGX approximation for runtime performance
    float NdotL = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, 32.0 * (1.0 - finalRoughness + 0.05)) * finalMetallic;

    vec3 ambient = vec3(0.04) * finalAlbedo;
    vec3 diffuse = finalAlbedo * NdotL;
    vec3 specular = vec3(spec);

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
  }
`;

export const GlassFractureShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying float vDamageIntensity;

  void main() {
    // Procedural Voronoi crack web pattern
    vec2 p = vUv * 45.0;
    vec2 f = fract(p) - 0.5;
    float dist = length(f);
    float crackPattern = smoothstep(0.04, 0.0, abs(dist - 0.35));

    if (vDamageIntensity > 0.45) {
      // Shattered white web glass effect
      vec3 crackColor = vec3(0.9, 0.95, 1.0);
      gl_FragColor = vec4(crackColor, mix(0.4, 0.95, crackPattern));
    } else {
      // Clean reflective safety glass
      gl_FragColor = vec4(0.15, 0.22, 0.28, 0.45);
    }
  }
`;
