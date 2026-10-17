import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshWobbleMaterial } from '@react-three/drei';

// 3D 软萌核心模型组件：一个会呼吸、会 Q 弹变形的治愈系水晶球/小萌物
function CuteFloatingMesh({ activePage }) {
  const meshRef = useRef();

  // 让模型随着时间缓缓自转
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} scale={activePage ? 1.2 : 1}>
        {/* 选用多面体或球体 */}
        <icosahedronGeometry args={[1.5, 0]} />
        {/* 带有治愈系果冻抖动质感的材质 */}
        <MeshWobbleMaterial
          color="#ff9a9e"
          roughness={0.3}
          metalness={0.2}
          factor={0.4} // 软萌 Q 弹变形程度
          speed={2}
        />
      </mesh>
      {/* 旁边点缀几个小浮动球 */}
      <mesh position={[2, 1, -1]} scale={0.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#a1c4fd" roughness={0.2} />
      </mesh>
      <mesh position={[-2, -1, -0.5]} scale={0.5}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d4fc79" roughness={0.2} />
      </mesh>
    </Float>
  );
}

export default function App() {
  const [currentMenu, setCurrentMenu] = useState('home');

  return (
    <div style={styles.container}>
      {/* 背景 3D 渲染画布 */}
      <div style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a1c4fd" />
          
          {/* 3D 软萌模型 */}
          <CuteFloatingMesh activePage={currentMenu !== 'home'} />
          
          {/* 允许鼠标轻度旋转视角 */}
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
        </Canvas>
      </div>

      {/* 前端 UI：有趣的交互式开启菜单 */}
      <div style={styles.uiOverlay}>
        <header style={styles.header}>
          <h1 style={styles.logo}>✨ Laurency's Space</h1>
          <p style={styles.subtitle}>探索 3D 交互与极客视觉的治愈世界</p>
        </header>

        {/* 菜单控制台 */}
        <div style={styles.menuCard}>
          <div style={styles.menuTitle}>📌 开启控制台 (Control Panel)</div>
          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.btn, background: currentMenu === 'home' ? '#ff9a9e' : 'rgba(255,255,255,0.7)' }}
              onClick={() => setCurrentMenu('home')}
            >
              🏠 欢迎主页
            </button>
            <button
              style={{ ...styles.btn, background: currentMenu === 'gallery' ? '#ff9a9e' : 'rgba(255,255,255,0.7)' }}
              onClick={() => setCurrentMenu('gallery')}
            >
              📷 摄影画廊
            </button>
            <button
              style={{ ...styles.btn, background: currentMenu === 'lab' ? '#ff9a9e' : 'rgba(255,255,255,0.7)' }}
              onClick={() => setCurrentMenu('lab')}
            >
              🦾 硬件机械库
            </button>
            <button
              style={{ ...styles.btn, background: currentMenu === 'notes' ? '#ff9a9e' : 'rgba(255,255,255,0.7)' }}
              onClick={() => setCurrentMenu('notes')}
            >
              📝 数字花园
            </button>
          </div>

          {/* 根据当前选择展示不同页面的动态内容 */}
          <div style={styles.contentBox}>
            {currentMenu === 'home' && (
              <p>当前处于 3D 欢迎页。移动鼠标可旋转视角，点击上方菜单切换功能模块！☁️</p>
            )}
            {currentMenu === 'gallery' && (
              <p>📸 摄影画廊页面：这里将展示你的胶片与数码大作（待开发）。</p>
            )}
            {currentMenu === 'lab' && (
              <p>🦾 硬件机械库：展示 Delta 机器人、视觉算法与 3D 建模作品（待开发）。</p>
            )}
            {currentMenu === 'notes' && (
              <p>📝 数字花园：记录你的开发心得与奇思妙想（待开发）。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 样式定义
const styles = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #fcefee 0%, #d8eefe 100% )',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  uiOverlay: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '40px',
    boxSizing: 'border-box',
    pointerEvents: 'none', // 让鼠标事件可以穿透到下方的 Canvas 旋转
  },
  header: {
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  logo: {
    fontSize: '32px',
    color: '#4a4e69',
    margin: '0 0 8px 0',
    fontWeight: '800',
    textShadow: '0 2px 10px rgba(255,255,255,0.8)',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6c757d',
    margin: 0,
  },
  menuCard: {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '2px solid rgba(255, 255, 255, 0.9)',
    borderRadius: '24px',
    padding: '24px 32px',
    boxShadow: '0 20px 40px rgba(160, 180, 200, 0.2)',
    width: '460px',
    maxWidth: '90%',
    textAlign: 'center',
    pointerEvents: 'auto', // 确保按钮可以点击
    marginBottom: '20px',
  },
  menuTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#4a4e69',
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  btn: {
    padding: '10px 16px',
    borderRadius: '14px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a4e69',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
  },
  contentBox: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    background: 'rgba(255,255,255,0.5)',
    padding: '12px 16px',
    borderRadius: '12px',
  },
};