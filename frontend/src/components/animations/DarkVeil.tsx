"use client"

import { useEffect, useRef } from "react"
import { Mesh, Program, Renderer, Triangle } from "ogl"

import { cn } from "@/lib/utils"

export interface DarkVeilProps {
    hueShift?: number
    noiseIntensity?: number
    scanlineIntensity?: number
    scanlineFrequency?: number
    speed?: number
    warpAmount?: number
    resolutionScale?: number
    className?: string
}

const VERTEX_SHADER = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uHueShift;
uniform float uNoiseIntensity;
uniform float uScanlineIntensity;
uniform float uScanlineFrequency;
uniform float uSpeed;
uniform float uWarpAmount;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }

  return value;
}

vec3 hueRotate(vec3 color, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  mat3 m = mat3(
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.140,
    0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072
  );

  return clamp(m * color, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  float t = uTime * uSpeed;
  float slowNoise = fbm(p * 1.28 + vec2(t * 0.045, -t * 0.035));
  vec2 warped = p + vec2(
    fbm(p * 2.0 + vec2(t * 0.08, 0.0)) - 0.5,
    fbm(p * 1.6 + vec2(0.0, -t * 0.06)) - 0.5
  ) * uWarpAmount;

  float veilA = fbm(warped * 1.7 + slowNoise * 0.62 + t * 0.03);
  float veilB = fbm(warped * 3.4 - slowNoise * 0.35 - t * 0.04);
  float wave = sin((warped.x * 3.2 + warped.y * 1.25 + veilA * 1.8 + t * 0.28) * 3.14159);
  float ribbon = smoothstep(0.08, 0.95, abs(wave) * 0.78 + veilB * 0.42);

  vec3 base = vec3(0.003, 0.010, 0.010);
  vec3 emerald = vec3(0.018, 0.42, 0.24);
  vec3 teal = vec3(0.014, 0.22, 0.30);
  vec3 violet = vec3(0.17, 0.13, 0.38);

  float topGlow = 1.0 - smoothstep(-1.0, 0.66, warped.y);
  float sideGlow = 1.0 - smoothstep(0.10, 1.36, length(warped - vec2(0.64, -0.24)));
  float leftGlow = 1.0 - smoothstep(0.0, 1.34, length(warped - vec2(-0.78, 0.10)));

  vec3 color = base;
  color += emerald * ribbon * 0.115;
  color += teal * veilA * topGlow * 0.075;
  color += violet * sideGlow * 0.09;
  color += emerald * leftGlow * 0.055;

  color = hueRotate(color, radians(uHueShift));

  float scanline = sin((uv.y * uResolution.y) / max(uScanlineFrequency, 1.0) + t * 1.15) * 0.5 + 0.5;
  color -= scanline * uScanlineIntensity * 0.28;

  float grain = noise(uv * uResolution.xy * 0.62 + t * 3.0) - 0.5;
  color += grain * uNoiseIntensity * 0.7;

  float vignette = smoothstep(1.28, 0.28, length((uv - 0.5) * vec2(1.35, 1.0)));
  color *= 0.46 + vignette * 0.52;
  color *= 0.86;

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`

export default function DarkVeil({
    hueShift = 120,
    noiseIntensity = 0.006,
    scanlineIntensity = 0.006,
    scanlineFrequency = 10,
    speed = 0.18,
    warpAmount = 0.035,
    resolutionScale = 1,
    className,
}: DarkVeilProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) {
            return
        }

        let animationFrame = 0
        let renderer: Renderer | null = null

        try {
            renderer = new Renderer({ alpha: true, antialias: false })
        } catch {
            return
        }

        const gl = renderer.gl
        gl.clearColor(0, 0, 0, 0)
        gl.canvas.style.position = "absolute"
        gl.canvas.style.inset = "0"
        gl.canvas.style.width = "100%"
        gl.canvas.style.height = "100%"
        gl.canvas.style.pointerEvents = "none"
        container.appendChild(gl.canvas)

        const geometry = new Triangle(gl)
        const program = new Program(gl, {
            vertex: VERTEX_SHADER,
            fragment: FRAGMENT_SHADER,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: [1, 1] },
                uHueShift: { value: hueShift },
                uNoiseIntensity: { value: noiseIntensity },
                uScanlineIntensity: { value: scanlineIntensity },
                uScanlineFrequency: { value: scanlineFrequency },
                uSpeed: { value: speed },
                uWarpAmount: { value: warpAmount },
            },
        })
        const mesh = new Mesh(gl, { geometry, program })

        const resize = () => {
            const width = Math.max(Math.round(container.clientWidth * resolutionScale), 1)
            const height = Math.max(Math.round(container.clientHeight * resolutionScale), 1)
            renderer?.setSize(width, height)
            ;(program.uniforms.uResolution.value as number[]) = [width, height]
        }

        const update = (frameTime: number) => {
            program.uniforms.uTime.value = frameTime * 0.001
            renderer?.render({ scene: mesh })
            animationFrame = requestAnimationFrame(update)
        }

        resize()
        window.addEventListener("resize", resize)
        animationFrame = requestAnimationFrame(update)

        return () => {
            window.removeEventListener("resize", resize)
            cancelAnimationFrame(animationFrame)
            if (gl.canvas.parentNode === container) {
                container.removeChild(gl.canvas)
            }
            gl.getExtension("WEBGL_lose_context")?.loseContext()
        }
    }, [hueShift, noiseIntensity, resolutionScale, scanlineFrequency, scanlineIntensity, speed, warpAmount])

    return <div ref={containerRef} aria-hidden="true" className={cn("relative h-full w-full overflow-hidden", className)} />
}
