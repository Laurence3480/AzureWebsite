import * as THREE from 'three'
import { mood } from './mood'

const vert = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const frag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uGlow;
  varying vec3 vPos;
  void main() {
    vec3 d = normalize(vPos);
    float t = smoothstep(-0.05, 0.65, d.y);
    vec3 c = mix(uHor, uTop, t);
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    c += uSunColor * (pow(s, 28.0) * 0.55 + pow(s, 5.0) * 0.16) * uGlow;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uSunColor: { value: new THREE.Color() },
      uGlow: { value: 1 },
    },
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
}

export function applySkyUniforms(mat) {
  const u = mat.uniforms
  u.uTop.value.copy(mood.top)
  u.uHor.value.copy(mood.hor)
  u.uSunDir.value.copy(mood.sunDir)
  u.uSunColor.value.copy(mood.sunColor)
  u.uGlow.value = Math.min(1, Math.max(0, (mood.sunDir.y + 0.25) / 0.35))
}
