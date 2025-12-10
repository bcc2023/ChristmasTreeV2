import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Camera, Hand, Upload, Info, Loader2, Sparkles } from 'lucide-react';
import Experience, { ControlsRef } from './components/Experience';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const App: React.FC = () => {
  // UI State
  const [userImages, setUserImages] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(true);
  const [cameraMode, setCameraMode] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [isGatheredUI, setIsGatheredUI] = useState(false); // For UI feedback only

  // Refs for logic (Single source of truth for 3D loop)
  const controlsRef = useRef<ControlsRef>({ 
    isGathered: false, 
    rotation: 0 
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>(0);

  // --------------------------------------------------------------------------
  // Hand Tracking Logic
  // --------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!active) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        landmarkerRef.current = landmarker;
        console.log("HandLandmarker loaded");
      } catch (error) {
        console.error("MediaPipe error:", error);
      }
    };

    if (cameraMode) {
      setupMediaPipe();
    }

    return () => { active = false; };
  }, [cameraMode]);

  const processVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState >= 2 && landmarkerRef.current) {
      const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        if (!handDetected) setHandDetected(true);
        
        const landmarks = results.landmarks[0]; // First hand
        
        // 1. Calculate Rotation from Palm Center X
        // Invert X because webcam is mirrored
        const palmX = landmarks[0].x; 
        const rotation = (0.5 - palmX) * Math.PI * 1.5; // Map 0..1 to -135deg..135deg

        // 2. Calculate "Gather" state (Clench)
        // Measure openness: Avg dist from Tip to Wrist / Scale
        const wrist = landmarks[0];
        const mcp = landmarks[9]; // Middle finger knuckle
        const scale = Math.hypot(wrist.x - mcp.x, wrist.y - mcp.y, wrist.z - mcp.z) || 1;
        
        const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        let totalDist = 0;
        tips.forEach(i => {
            const t = landmarks[i];
            totalDist += Math.hypot(wrist.x - t.x, wrist.y - t.y, wrist.z - t.z);
        });
        const openness = (totalDist / 5) / scale;

        // Thresholds: < 1.4 is usually a fist, > 1.8 is open
        const isClenched = openness < 1.5;

        // Update Controls Ref directly
        controlsRef.current.rotation = rotation;
        controlsRef.current.isGathered = isClenched;
        
        // Update UI state occasionally (debounced naturally by React) if needed
        if (isClenched !== isGatheredUI) setIsGatheredUI(isClenched);

      } else {
        if (handDetected) setHandDetected(false);
      }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  }, [handDetected, isGatheredUI]);

  // Start/Stop Camera Loop
  useEffect(() => {
    if (cameraMode && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
                // Start processing loop
                requestRef.current = requestAnimationFrame(processVideo);
            };
          }
        })
        .catch(err => console.error("Camera denied", err));
    } else {
       cancelAnimationFrame(requestRef.current);
       if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(t => t.stop());
         videoRef.current.srcObject = null;
       }
       setHandDetected(false);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [cameraMode, processVideo]);


  // --------------------------------------------------------------------------
  // Mouse / Touch Fallback Interaction
  // --------------------------------------------------------------------------
  const handlePointerMove = (x: number) => {
    if (!handDetected) {
      // Normalize 0..windowWidth to -1..1
      const normalized = (x / window.innerWidth) * 2 - 1;
      controlsRef.current.rotation = normalized * Math.PI * 0.5;
    }
  };

  // Robust pointer events
  useEffect(() => {
    const onPointerDown = () => {
      if (!handDetected) {
        controlsRef.current.isGathered = true;
        setIsGatheredUI(true);
      }
    };
    const onPointerUp = () => {
      if (!handDetected) {
        controlsRef.current.isGathered = false;
        setIsGatheredUI(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchstart', onPointerDown);
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [handDetected]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map(file => URL.createObjectURL(file as File));
      setUserImages(prev => {
          const updated = [...newImages, ...prev].slice(0, 10);
          return updated;
      });
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden select-none"
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onTouchMove={(e) => e.touches.length > 0 && handlePointerMove(e.touches[0].clientX)}
    >
      {/* Background Video */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-0 ${cameraMode ? 'opacity-30' : 'opacity-0'}`}
      />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-10">
        <Canvas dpr={[1, 2]} gl={{ antialias: false, toneMapping: 3 }}>
           <Experience 
              controlsRef={controlsRef}
              images={userImages} 
           />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-light tracking-[0.2em] text-[#FFD700] uppercase font-serif drop-shadow-[0_2px_15px_rgba(255,215,0,0.5)]">
              Merry Christmas
            </h1>
            <p className="text-emerald-400 text-xs tracking-widest mt-1 opacity-80 flex items-center gap-2">
              INTERACTIVE HOLIDAY EXPERIENCE
              {handDetected && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </p>
          </div>
          
          <div className="flex gap-4">
             <button 
                onClick={() => setCameraMode(!cameraMode)}
                className={`flex items-center justify-center w-12 h-12 rounded-full border border-[#FFD700]/30 backdrop-blur-md transition-all duration-500 ${cameraMode ? 'bg-[#FFD700] text-black shadow-[0_0_20px_#FFD700]' : 'bg-black/40 text-[#FFD700]'}`}
             >
                {cameraMode && !handDetected ? <Loader2 className="animate-spin" size={20}/> : <Camera size={20} />}
             </button>
             <button 
                onClick={() => setShowInfo(!showInfo)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black/40 border border-[#FFD700]/30 text-[#FFD700] backdrop-blur-md hover:bg-[#FFD700]/10"
             >
                <Info size={20} />
             </button>
          </div>
        </div>

        {/* Center Interaction Hint */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 pointer-events-none ${isGatheredUI ? 'scale-110 opacity-100' : 'scale-100 opacity-60'}`}>
             {!isGatheredUI && !handDetected && (
                <>
                  <div className="w-16 h-16 rounded-full border border-white/20 mx-auto mb-4 animate-ping opacity-50 flex items-center justify-center">
                    <Sparkles size={24} className="text-[#FFD700] animate-spin-slow opacity-80" />
                  </div>
                  <p className="text-white/50 text-sm tracking-widest uppercase">Hold to Morph</p>
                </>
             )}
             {handDetected && (
                <div className="flex flex-col items-center gap-2">
                   <Hand className={`text-[#FFD700] transition-transform duration-300 ${isGatheredUI ? 'scale-75' : 'scale-125'}`} size={40} />
                   <p className="text-[#FFD700]/80 text-xs tracking-widest uppercase">{isGatheredUI ? 'Gathered' : 'Open Hand to Scatter'}</p>
                </div>
             )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end pointer-events-auto w-full">
            <div className="relative group overflow-hidden rounded-full">
                {/* IMPORTANT: Input must have high z-index and be pointer-events-auto */}
                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                    title="Upload photos"
                />
                <button className="flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-900/40 border border-emerald-500/30 backdrop-blur-md text-emerald-100 group-hover:bg-emerald-800/60 transition-all pointer-events-none">
                    <Upload size={18} />
                    <span className="text-xs uppercase tracking-widest">Add Memories ({userImages.length}/10)</span>
                </button>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-colors duration-500 ${handDetected ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]' : 'bg-black/40 border-white/5 text-white/40'}`}>
                <Hand size={16} />
                <span className="text-[10px] uppercase tracking-widest">
                    {handDetected ? 'Hand Tracking Active' : 'Mouse Control Active'}
                </span>
            </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
            <div className="bg-[#001008] border border-[#FFD700]/20 p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(0,40,21,0.5)]">
                <button 
                    onClick={() => setShowInfo(false)}
                    className="absolute top-4 right-4 text-emerald-500 hover:text-[#FFD700]"
                >
                    ✕
                </button>
                <h2 className="text-2xl text-[#FFD700] font-serif mb-4">Merry Christmas</h2>
                <div className="space-y-4 text-emerald-100/70 text-sm font-light leading-relaxed">
                    <p>Welcome to a cinematic 3D holiday experience.</p>
                    
                    <div className="flex gap-3">
                        <div className="p-2 bg-emerald-900/50 rounded h-fit"><Hand size={16} className="text-[#FFD700]"/></div>
                        <div>
                            <strong className="text-white block mb-1">Gesture Control</strong>
                            Activate the camera to control the tree with your hand. 
                            <ul className="list-disc pl-4 mt-1 opacity-80">
                                <li>Rotate your hand to spin the tree.</li>
                                <li><strong>Clench Fist</strong> to Gather the tree.</li>
                                <li><strong>Open Hand</strong> to Scatter.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="p-2 bg-emerald-900/50 rounded h-fit"><Camera size={16} className="text-[#FFD700]"/></div>
                         <div>
                            <strong className="text-white block mb-1">Mouse / Touch</strong>
                            Click and hold anywhere to gather. Move cursor to rotate.
                         </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="p-2 bg-emerald-900/50 rounded h-fit"><Upload size={16} className="text-[#FFD700]"/></div>
                         <div>
                            <strong className="text-white block mb-1">Add Memories</strong>
                            Click the button bottom-left to upload photos to the golden frames.
                         </div>
                    </div>
                </div>
                <button 
                    onClick={() => { setShowInfo(false); setCameraMode(true); }}
                    className="w-full mt-8 py-3 bg-[#FFD700] text-black font-bold uppercase tracking-widest hover:bg-white transition-colors"
                >
                    Enable Camera & Start
                </button>
                 <button 
                    onClick={() => setShowInfo(false)}
                    className="w-full mt-2 py-3 text-[#FFD700]/50 text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                    Continue without Camera
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;