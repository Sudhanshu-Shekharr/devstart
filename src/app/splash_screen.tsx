'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

/* -------------------------------------------------------------------------- */
/*  DottedSurface — animated waving-dots background (Three.js)                */
/* -------------------------------------------------------------------------- */

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const { theme } = useTheme();

	const containerRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<{
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		particles: THREE.Points[];
		animationId: number;
		count: number;
	} | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 75;
		const AMOUNTY = 85;

		// Scene setup
		const scene = new THREE.Scene();

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x000000, 0);

		containerRef.current.appendChild(renderer.domElement);

		// Create particles
		const positions: number[] = [];
		const colors: number[] = [];

		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Will be animated
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
				colors.push(1.0, 1.0, 1.0);
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		const material = new THREE.PointsMaterial({
			size: 10,
			vertexColors: true,
			transparent: true,
			opacity: 1.0,
			sizeAttenuation: true,
		});

		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let count = 0;
		let animationId = 0;

		const animate = () => {
			animationId = requestAnimationFrame(animate);

			const positionAttribute = geometry.attributes.position;
			const positions = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					positions[index + 1] =
						Math.sin((ix + count) * 0.3) * 50 +
						Math.sin((iy + count) * 0.5) * 50;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;

			renderer.render(scene, camera);
			count += 0.1;
		};

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		animate();

		sceneRef.current = {
			scene,
			camera,
			renderer,
			particles: [points],
			animationId,
			count,
		};

		return () => {
			window.removeEventListener('resize', handleResize);

			if (sceneRef.current) {
				cancelAnimationFrame(sceneRef.current.animationId);

				sceneRef.current.scene.traverse((object) => {
					if (object instanceof THREE.Points) {
						object.geometry.dispose();
						if (Array.isArray(object.material)) {
							object.material.forEach((material) => material.dispose());
						} else {
							object.material.dispose();
						}
					}
				});

				sceneRef.current.renderer.dispose();

				if (containerRef.current && sceneRef.current.renderer.domElement) {
					containerRef.current.removeChild(
						sceneRef.current.renderer.domElement,
					);
				}
			}
		};
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none absolute inset-0', className)}
			{...props}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/*  Nav                                                                        */
/* -------------------------------------------------------------------------- */

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const defaultTextColor = 'text-muted';
  const hoverTextColor = 'text-foreground';
  const textSizeClass = 'text-xs lg:text-sm';

  return (
    <a href={href} className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}>
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </a>
  );
};

interface MiniNavbarProps {
  flowType: 'signup' | 'login';
  setFlowType: (type: 'signup' | 'login') => void;
  resetForm: () => void;
}

function MiniNavbar({ flowType, setFlowType, resetForm }: MiniNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <div className="flex items-center gap-2 group select-none">
      <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
        <div className="absolute inset-0 bg-foreground/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-foreground top-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 group-hover:-translate-y-0.5" />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-foreground left-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:-translate-x-0.5" />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-foreground right-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:translate-x-0.5" />
        <span className="absolute w-1.5 h-1.5 rounded-full bg-foreground bottom-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 group-hover:translate-y-0.5" />
        <span className="absolute w-1 h-1 rounded-full bg-foreground/50" />
      </div>
      <span className="text-foreground font-bold tracking-tight text-sm">
        Devstart
      </span>
    </div>
  );

  const navLinksData = [
    { label: 'About Us', href: '#1' },
    { label: 'Features', href: '#2' },
    { label: 'Browse Internships', href: '#3' },
    { label: 'FAQs', href: '#4' },
  ];

  const handleLoginClick = () => {
    setFlowType('login');
    resetForm();
  };

  const handleSignupClick = () => {
    setFlowType('signup');
    resetForm();
  };

  const loginButtonElement = (
    <button
      onClick={handleLoginClick}
      className={cn(
        "px-2.5 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full transition-all duration-200 w-full md:w-auto",
        flowType === 'login'
          ? "font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400"
          : "border border-[#333] bg-[rgba(31,31,31,0.62)] text-muted hover:border-foreground/50 hover:text-foreground"
      )}
    >
      LogIn
    </button>
  );

  const signupButtonElement = (
    <button
      onClick={handleSignupClick}
      className={cn(
        "px-2.5 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full transition-all duration-200 z-10 w-full md:w-auto",
        flowType === 'signup'
          ? "font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400"
          : "border border-[#333] bg-[rgba(31,31,31,0.62)] text-muted hover:border-foreground/50 hover:text-foreground"
      )}
    >
      Signup
    </button>
  );

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20
                       flex flex-col items-center
                       pl-6 pr-6 py-3 backdrop-blur-sm
                       ${headerShapeClass}
                       border border-[#333] bg-[#1f1f1f57]
                       w-[calc(100%-2rem)] md:w-auto
                       transition-[border-radius] duration-0 ease-in-out`}>

      <div className="flex items-center justify-between w-full gap-x-3 md:gap-x-6 lg:gap-x-8">
        <div className="flex items-center">
           {logoElement}
        </div>

        <nav className="hidden md:flex items-center space-x-3 lg:space-x-6 text-xs lg:text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label === 'Browse Internships' ? (
                <>
                  <span className="hidden lg:inline">Browse </span>Internships
                </>
              ) : (
                link.label
              )}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button className="md:hidden flex items-center justify-center w-8 h-8 text-muted focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div className={`md:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <a key={link.href} href={link.href} className="text-muted hover:text-foreground transition-colors w-full text-center">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </motion.header>
  );
}

/* -------------------------------------------------------------------------- */
/*  SignInPage — same email -> code -> success flow, dotted-wave background   */
/* -------------------------------------------------------------------------- */

interface SignInPageProps {
  className?: string;
  /** When true, skip rendering the outer bg-black shell, DottedSurface, and
   *  MiniNavbar. Used when the layout already provides those elements. */
  noShell?: boolean;
}

/**
 * Inner component that reads the ?flow= search param to set initial flowType.
 * Must be wrapped in <Suspense> because useSearchParams opts into dynamic rendering.
 */
function SignInPageInner({ className, noShell }: SignInPageProps) {
  const searchParams = useSearchParams();
  const initialFlow = searchParams.get('flow') === 'login' ? 'login' : 'signup';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [flowType, setFlowType] = useState<"signup" | "login">(initialFlow);
  const [step, setStep] = useState<"email" | "code" | "password" | "success">("email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync flowType when the URL query param changes (e.g. nav LogIn/Signup click)
  useEffect(() => {
    const flow = searchParams.get('flow');
    setFlowType(flow === 'login' ? 'login' : 'signup');
  }, [searchParams]);

  // Drives a subtle background "pulse" once the code is verified — the
  // wave surface briefly speeds up / brightens instead of the old
  // dot-matrix reveal-in-reverse effect.
  const [backgroundPulse, setBackgroundPulse] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setCode(["", "", "", "", "", ""]);
    setStep("email");
    setBackgroundPulse(false);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      if (flowType === "signup") {
        setStep("code");
      } else {
        setStep("password");
      }
    }
  };

  useEffect(() => {
    if (step === "code") {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 500);
    }
  }, [step]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }

      if (index === 5 && value) {
        const isComplete = newCode.every(digit => digit.length === 1);
        if (isComplete) {
          setTimeout(() => {
            setStep("password");
          }, 500);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleBackClick = () => {
    setStep("email");
    setCode(["", "", "", "", "", ""]);
    setBackgroundPulse(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length >= 6) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
      }
      setBackgroundPulse(true);
      setTimeout(() => {
        setStep("success");
      }, 2000);
    }
  };

  const handlePasswordBackClick = () => {
    if (flowType === "signup") {
      setStep("code");
    } else {
      setStep("email");
    }
  };

  const formContent = (
    <div className="w-full mt-[90px] max-w-sm px-4">
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email-step"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 text-center"
          >
            <div className="space-y-1 flex flex-col items-center">
              <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground whitespace-nowrap">Land Your First Dev Internship</h1>
              <p className="text-xl text-foreground/70 font-light">Sign in to start applying</p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
                className="backdrop-blur-[2px] w-full flex items-center justify-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 rounded-full py-3 px-4 transition-colors"
              >
                <span className="text-lg">G</span>
                <span>Sign in with GitHub</span>
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px bg-foreground/10 flex-1" />
                <span className="text-muted/70 text-sm">or</span>
                <div className="h-px bg-foreground/10 flex-1" />
              </div>

              <form onSubmit={handleEmailSubmit}>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full backdrop-blur-[1px] text-foreground border-1 border-foreground/10 rounded-full py-3 px-4 focus:outline-none focus:border focus:border-foreground/30 text-center"
                    required
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 text-foreground w-9 h-9 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors group overflow-hidden"
                  >
                    <span className="relative w-full h-full block overflow-hidden">
                      <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">
                        →
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">
                        →
                      </span>
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <p className="text-xs text-muted/70 pt-10">
              By signing up, you agree to <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">our Terms of Service</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Internship Policies</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Privacy Notice</Link>, and <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Cookie Notice</Link>.
            </p>
          </motion.div>
        ) : step === "code" ? (
          <motion.div
            key="code-step"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 text-center"
          >
            <div className="space-y-1">
              <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">We sent you a code</h1>
              <p className="text-[1.25rem] text-muted/80 font-light">Please enter it</p>
            </div>

            <div className="w-full">
              <div className="relative rounded-full py-4 px-5 border border-foreground/10 bg-transparent">
                <div className="flex items-center justify-center">
                  {code.map((digit, i) => (
                    <div key={i} className="flex items-center">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            codeInputRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleCodeChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className="w-8 text-center text-xl bg-transparent text-foreground border-none focus:outline-none focus:ring-0 appearance-none"
                          style={{ caretColor: 'transparent' }}
                        />
                        {!digit && (
                          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                            <span className="text-xl text-foreground">0</span>
                          </div>
                        )}
                      </div>
                      {i < 5 && <span className="text-muted/40 text-xl">|</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <motion.p
                className="text-muted/80 hover:text-foreground/70 transition-colors cursor-pointer text-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                Resend code
              </motion.p>
            </div>

            <div className="flex w-full gap-3">
              <motion.button
                onClick={handleBackClick}
                className="rounded-full bg-foreground text-black font-medium px-8 py-3 hover:bg-foreground/90 transition-colors w-[30%]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                Back
              </motion.button>
              <motion.button
                onClick={() => {
                  if (code.every(d => d !== "")) {
                    setStep("password");
                  }
                }}
                className={`flex-1 rounded-full font-medium py-3 border transition-all duration-300 ${
                  code.every(d => d !== "")
                  ? "bg-foreground text-black border-transparent hover:bg-foreground/90 cursor-pointer"
                  : "bg-[#111] text-muted/80 border-foreground/10 cursor-not-allowed"
                }`}
                disabled={!code.every(d => d !== "")}
              >
                Continue
              </motion.button>
            </div>

            <div className="pt-16">
              <p className="text-xs text-muted/70">
                By signing up, you agree to <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">our Terms of Service</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Internship Policies</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Privacy Notice</Link>, and <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Cookie Notice</Link>.
              </p>
            </div>
          </motion.div>
        ) : step === "password" ? (
          <motion.div
            key="password-step"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 text-center"
          >
            <div className="space-y-1 flex flex-col items-center">
              <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground whitespace-nowrap">Enter Password</h1>
              <p className="text-[1.8rem] text-foreground/70 font-light">Please enter your password</p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full backdrop-blur-[1px] text-foreground border-1 border-foreground/10 rounded-full py-3 px-4 focus:outline-none focus:border focus:border-foreground/30 text-center"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 text-foreground w-9 h-9 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors group overflow-hidden"
                >
                  <span className="relative w-full h-full block overflow-hidden">
                    <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">
                      →
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">
                      →
                    </span>
                  </span>
                </button>
              </div>
            </form>

            <div className="flex w-full gap-3">
              <motion.button
                type="button"
                onClick={handlePasswordBackClick}
                className="rounded-full bg-foreground text-black font-medium px-8 py-3 hover:bg-foreground/90 transition-colors w-[30%]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                onClick={handlePasswordSubmit}
                className={`flex-1 rounded-full font-medium py-3 border transition-all duration-300 ${
                  password.length >= 6
                  ? "bg-foreground text-black border-transparent hover:bg-foreground/90 cursor-pointer"
                  : "bg-[#111] text-muted/80 border-foreground/10 cursor-not-allowed"
                }`}
                disabled={password.length < 6}
              >
                Continue
              </motion.button>
            </div>

            <div className="pt-16">
              <p className="text-xs text-muted/70">
                By signing up, you agree to <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">our Terms of Service</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Internship Policies</Link>, <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Privacy Notice</Link>, and <Link href="#" className="underline text-muted/70 hover:text-muted transition-colors">Cookie Notice</Link>.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success-step"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-1">
              <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">You&apos;re in!</h1>
              <p className="text-[1.25rem] text-muted/80 font-light">Welcome</p>
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="py-10"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </motion.div>

            <Link href="/dashboard" className="block w-full">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="w-full rounded-full bg-foreground text-black font-medium py-3 hover:bg-foreground/90 transition-colors"
              >
                Continue to Dashboard
              </motion.button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const toastElement = (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50
                     flex items-center gap-3 px-5 py-3.5 rounded-full
                     border border-[#333] bg-[#090909] text-foreground shadow-2xl"
        >
          <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
            G
          </div>
          <span className="text-sm font-medium tracking-tight whitespace-nowrap">
            Feature coming soon...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // noShell=true: layout provides the background + nav; render just the form column
  if (noShell) {
    return (
      <div className={cn("flex flex-1 flex-col lg:flex-row", className)}>
        <div className="flex-1 flex flex-col justify-center items-center">
          {formContent}
        </div>
        {toastElement}
      </div>
    );
  }

  // Default: self-contained shell with its own background + nav
  return (
    <div className={cn("flex w-[100%] flex-col min-h-screen bg-black relative", className)}>
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Waving dots background */}
        <DottedSurface
          className={cn(
            "transition-[filter,opacity] duration-700 ease-out",
            backgroundPulse ? "brightness-150 opacity-100" : "opacity-100",
          )}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar
          flowType={flowType}
          setFlowType={setFlowType}
          resetForm={resetForm}
        />

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 flex flex-col justify-center items-center">
            {formContent}
          </div>
        </div>
      </div>
      {toastElement}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public export — wraps inner component in Suspense for useSearchParams    */
/* -------------------------------------------------------------------------- */

export const SignInPage = (props: SignInPageProps) => (
  <Suspense fallback={null}>
    <SignInPageInner {...props} />
  </Suspense>
);