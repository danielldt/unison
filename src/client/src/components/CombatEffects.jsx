import React, { useEffect, useState } from 'react';
import '../styles/combat-effects.scss';

/**
 * Component to display visual combat effects and animations
 */
const CombatEffects = ({ effect, targetPosition, onComplete }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Effect disappears after animation completes
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, getAnimationDuration(effect.type));
    
    return () => clearTimeout(timer);
  }, [effect, onComplete]);
  
  if (!visible) return null;
  
  return (
    <div 
      className="combat-effect" 
      style={{ 
        left: `${targetPosition?.x || 50}%`, 
        top: `${targetPosition?.y || 50}%` 
      }}
    >
      {renderEffect(effect)}
    </div>
  );
};

/**
 * Render the specific effect based on type
 */
const renderEffect = (effect) => {
  switch (effect.type) {
    case 'DAMAGE':
      return (
        <div className={`damage-effect ${effect.isCrit ? 'critical' : ''} ${effect.element ? effect.element : ''}`}>
          {effect.value}
          {effect.isCrit && <span className="critical-marker">!</span>}
        </div>
      );
      
    case 'HEAL':
      return (
        <div className={`heal-effect ${effect.isCrit ? 'critical' : ''}`}>
          +{effect.value}
          {effect.isCrit && <span className="critical-marker">!</span>}
        </div>
      );
      
    case 'MISS':
      return <div className="miss-effect">Miss</div>;
      
    case 'BUFF':
      return (
        <div className="buff-effect">
          <div className="buff-icon">↑</div>
          <div className="buff-text">{effect.stat}</div>
        </div>
      );
      
    case 'DEBUFF':
      return (
        <div className="debuff-effect">
          <div className="debuff-icon">↓</div>
          <div className="debuff-text">{effect.stat}</div>
        </div>
      );
      
    case 'DEFEAT':
      return <div className="defeat-effect">Defeated!</div>;
      
    case 'ELEMENTAL':
      return (
        <div className={`elemental-effect ${effect.element}`}>
          <div className="elemental-animation"></div>
        </div>
      );
      
    default:
      return <div className="generic-effect">{effect.value}</div>;
  }
};

/**
 * Get animation duration based on effect type
 */
const getAnimationDuration = (type) => {
  switch (type) {
    case 'DAMAGE': return 1000;
    case 'HEAL': return 1200;
    case 'MISS': return 800;
    case 'BUFF': return 1500;
    case 'DEBUFF': return 1500;
    case 'DEFEAT': return 2000;
    case 'ELEMENTAL': return 1800;
    default: return 1000;
  }
};

export default CombatEffects; 