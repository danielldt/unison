import React from 'react';
import '../styles/environment-effect.scss';

/**
 * Component to visualize environmental effects in dungeons
 */
const EnvironmentEffect = ({ environment }) => {
  if (!environment) return null;
  
  return (
    <div className={`environment-container ${environment.type}`}>
      <div className="environment-overlay"></div>
      <div className="environment-particles"></div>
      
      {environment.type === 'fire' && <FireEffect />}
      {environment.type === 'ice' && <IceEffect />}
      {environment.type === 'poison' && <PoisonEffect />}
      {environment.type === 'lightning' && <LightningEffect />}
      {environment.type === 'void' && <VoidEffect />}
      {environment.type === 'holy' && <HolyEffect />}
      {environment.type === 'corrupted' && <CorruptedEffect />}
      
      <div className="environment-description">
        <h3>{formatEnvironmentType(environment.type)}</h3>
        <p>{environment.description}</p>
        <div className="environment-effects">
          {environment.effects.map((effect, index) => (
            <div key={index} className="environment-effect">
              <span className="effect-icon">{getEffectIcon(effect.type)}</span>
              <span className="effect-description">{effect.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Environment-specific effect components
const FireEffect = () => (
  <div className="fire-effect">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="fire-particle" style={{ 
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${1 + Math.random() * 2}s`
      }}></div>
    ))}
  </div>
);

const IceEffect = () => (
  <div className="ice-effect">
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} className="ice-particle" style={{ 
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${5 + Math.random() * 15}px`,
        height: `${5 + Math.random() * 15}px`,
        opacity: 0.1 + Math.random() * 0.6
      }}></div>
    ))}
  </div>
);

const PoisonEffect = () => (
  <div className="poison-effect">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="poison-bubble" style={{ 
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        width: `${8 + Math.random() * 12}px`,
        height: `${8 + Math.random() * 12}px`
      }}></div>
    ))}
  </div>
);

const LightningEffect = () => (
  <div className="lightning-effect">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="lightning-bolt" style={{ 
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`
      }}></div>
    ))}
  </div>
);

const VoidEffect = () => (
  <div className="void-effect">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="void-orb" style={{ 
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s`,
        width: `${10 + Math.random() * 20}px`,
        height: `${10 + Math.random() * 20}px`
      }}></div>
    ))}
  </div>
);

const HolyEffect = () => (
  <div className="holy-effect">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="light-beam" style={{ 
        left: `${Math.random() * 100}%`,
        width: `${3 + Math.random() * 5}px`,
        opacity: 0.3 + Math.random() * 0.4,
        animationDelay: `${Math.random() * 3}s`
      }}></div>
    ))}
  </div>
);

const CorruptedEffect = () => (
  <div className="corrupted-effect">
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} className="corruption-tendril" style={{ 
        left: `${Math.random() * 100}%`,
        bottom: `-${10 + Math.random() * 20}px`,
        height: `${50 + Math.random() * 100}px`,
        width: `${3 + Math.random() * 8}px`,
        animationDelay: `${Math.random() * 4}s`
      }}></div>
    ))}
  </div>
);

// Helper functions
const formatEnvironmentType = (type) => {
  if (!type) return 'Unknown Environment';
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Environment';
};

const getEffectIcon = (effectType) => {
  switch (effectType) {
    case 'damage_over_time': return '🔥';
    case 'stat_modifier': return '⚖️';
    case 'healing': return '💚';
    case 'hazard': return '⚡';
    case 'buff': return '↗️';
    case 'debuff': return '↘️';
    default: return '✨';
  }
};

export default EnvironmentEffect; 