import * as THREE from 'three'

export const timeUniform = { value: 0 }

// 岛屿（地形 + 树 + 石头合并成一个网格）。树梢随风轻摆：高于地面的顶点按高度摆动
// 宝石/玻璃质感：低粗糙度 + 清漆 + 轻微虹彩；平面着色下每个切面各自整块反光
const gem = (extra) => ({
  flatShading: true,
  metalness: 0.12,
  roughness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  ior: 1.8,
  specularIntensity: 1,
  iridescence: 0.35,
  iridescenceIOR: 1.4,
  envMapIntensity: 1.3,
  ...extra,
})

// 岛身反光稍收：保住草木本色，只在切面朝向日月/天空时闪一下
export const landMat = new THREE.MeshPhysicalMaterial(gem({ vertexColors: true, clearcoat: 0.6, envMapIntensity: 0.85, iridescence: 0.25 }))
landMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = timeUniform
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float sw = max(transformed.y, 0.0);
       transformed.x += sin(uTime * 0.9 + position.x * 1.7 + position.z * 1.3) * 0.028 * sw;
       transformed.z += cos(uTime * 0.8 + position.z * 1.9 + position.x * 0.7) * 0.02 * sw;`,
    )
}

export const windowMat = new THREE.MeshPhysicalMaterial(
  gem({ color: '#ffe3b0', emissive: new THREE.Color('#ffae55'), emissiveIntensity: 0.1, roughness: 0.04, metalness: 0.2, iridescence: 0 }),
)

// 海面：低粗糙度 + 天空环境贴图 = 每个小平面各自反射天空/日月，闪闪的
export const seaMat = new THREE.MeshPhysicalMaterial(gem({ roughness: 0.06, metalness: 0.3, iridescence: 0.5, envMapIntensity: 1.4 }))

export const flowerMat = new THREE.MeshPhysicalMaterial(gem({ roughness: 0.04, metalness: 0.1, iridescence: 0.6 }))

// 小木屋：同样带光泽（像釉面的小玩具）
const glossy = (color, roughness) => new THREE.MeshPhysicalMaterial(gem({ color, roughness, iridescence: 0.2 }))
export const cabinMats = {
  wall: glossy('#f6e2c8', 0.18),
  roof: glossy('#e0786f', 0.1),
  door: glossy('#8c5c46', 0.22),
  chimney: glossy('#b08c7c', 0.2),
}

// 需要接收天空反射的材质
export const envMats = [landMat, windowMat, seaMat, flowerMat, ...Object.values(cabinMats)]
