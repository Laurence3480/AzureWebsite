import React, { useState, useRef } from 'react';

export default function HealingHero() {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // 鼠标移动时计算 3D 倾斜角度与光斑位置
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // 鼠标在卡片内的 X 坐标
    const y = e.clientY - rect.top;  // 鼠标在卡片内的 Y 坐标

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 计算倾斜角度 (限制最大旋转 15 度)
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    // 计算光斑相对百分比
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 0.4 });
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    // 鼠标离开时复原，触发 cubic-bezier Q弹回弹
    setRotate({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div style={styles.container}>
      {/* 2.5D 果冻卡片 */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          ...styles.card,
          transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(${isHovered ? 1.03 : 1}, ${isHovered ? 1.03 : 1}, 1)`,
          transition: isHovered
            ? 'transform 0.1s ease-out'
            : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', // Q弹物理回弹
        }}
      >
        {/* 光泽/高光图层 */}
        <div
          style={{
            ...styles.glare,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 220, 235, 0.2) 40%, transparent 80%)`,
            opacity: glare.opacity,
          }}
        />

        {/* 卡片内容 - 分层产生景深 */}
        <div style={styles.content}>
          <div style={styles.badge}>✨ Welcome World</div>
          <h1 style={styles.title}>今天也是治愈的一天 ☁️</h1>
          <p style={styles.subtitle}>点击或移动鼠标，探寻隐藏的奇妙微交互~</p>
          
          {/* 交互按钮 */}
          <button 
            style={styles.button}
            onClick={() => alert("获得了一个抱抱 (っº  º)っ ❤️")}
          >
            摸摸头 🌸
          </button>
        </div>
      </div>
    </div>
  );
}

// 柔和治愈系样式
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fef9d7 0%, #d2e9e6 100%)', // 奶黄与薄荷绿柔和渐变
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  card: {
    position: 'relative',
    width: '380px',
    height: '480px',
    borderRadius: '32px',
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(20px)', // 磨砂玻璃质感
    WebkitBackdropFilter: 'blur(20px)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 20px 40px rgba(160, 180, 200, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    transformStyle: 'preserve-3d',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    boxSizing: 'border-box',
  },
  glare: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '32px',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
  },
  content: {
    transform: 'translateZ(40px)', // 在 3D 空间内向前浮起，营造景深
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    background: '#FFE5EC',
    color: '#FF758F',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  title: {
    fontSize: '26px',
    color: '#4A4E69',
    margin: '0 0 12px 0',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: '15px',
    color: '#8D99AE',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  button: {
    padding: '12px 28px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFF',
    background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    border: 'none',
    borderRadius: '20px',
    boxShadow: '0 8px 15px rgba(255, 154, 158, 0.3)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
};