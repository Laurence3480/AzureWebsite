import * as THREE from 'three'

export const timeUniform = { value: 0 }

// 岛屿（地形 + 树 + 石头合并成一个网格）。树梢随风轻摆：高于地面的顶点按高度摆动
export const landMat = new THREE.MeshStandardMaterial({
  flatShading: true,
  vertexColors: true,
  roughness: 0.42,
  metalness: 0,
  envMapIntensity: 0.5,
})
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

export const windowMat = new THREE.MeshStandardMaterial({
  color: '#ffe3b0',
  emissive: new THREE.Color('#ffae55'),
  emissiveIntensity: 0.1,
  roughness: 0.15,
  metalness: 0.2,
  envMapIntensity: 1.2,
})

// 海面：低粗糙度 + 天空环境贴图 = 每个小平面各自反射天空/日月，闪闪的
export const seaMat = new THREE.MeshPhysicalMaterial({
  flatShading: true,
  roughness: 0.16,
  metalness: 0.1,
  ior: 1.7,
  specularIntensity: 1,
  envMapIntensity: 0.8,
})

export const flowerMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.3, envMapIntensity: 0.6 })

// 小木屋：同样带光泽（像釉面的小玩具）
const glossy = (color, roughness, envMapIntensity) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0, envMapIntensity })
export const cabinMats = {
  wall: glossy('#f6e2c8', 0.45, 0.5),
  roof: glossy('#e0786f', 0.3, 0.7),
  door: glossy('#8c5c46', 0.5, 0.6),
  chimney: glossy('#b08c7c', 0.45, 0.7),
}

// 需要接收天空反射的材质
export const envMats = [landMat, windowMat, seaMat, flowerMat, ...Object.values(cabinMats)]
