"use client"

import { useEffect, useMemo, useRef } from "react"
import { Color, Mesh, Program, Renderer, Triangle } from "ogl"

import { cn } from "@/lib/utils"

type RaysOrigin =
    | "top-left"
    | "top-center"
    | "top-right"
    | "left"
    | "right"
    | "center"

export interface LightRaysProps {
    raysOrigin?: RaysOrigin
    raysColor?: string
    raysSpeed?: number
    lightSpread?: number
    rayLength?: number
    pulsating?: boolean
    fadeDistance?: number
    saturation?: number
    followMouse?: boolean
    mouseInfluence?: number
    noiseAmount?: number
    distortion?: number
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
uniform vec2 uOrigin;
uniform vec2 uDirection;
uniform vec3 uRaysColor;
uniform float uLightSpread;
uniform float uRayLength;
uniform float uPulsating;
uniform float uFadeDistance;
uniform float uSaturation;
uniform float uNoiseAmount;
uniform float uDistortion;

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
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

vec3 saturateColor(vec3 color, float saturation) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, saturation);
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 uv = vUv;
  vec2 origin = uOrigin;
  vec2 direction = normalize(uDirection);

  vec2 p = (uv - origin) * aspect;
  float distanceToOrigin = length(p);
  vec2 rayDirection = normalize(p + 0.0001);

  float directionalFocus = dot(rayDirection, direction);
  float cone = smoothstep(1.0 - uLightSpread, 1.0, directionalFocus);

  float angle = atan(rayDirection.y, rayDirection.x);
  float movingNoise = fbm(vec2(angle * 2.8 + uTime * 0.18, distanceToOrigin * 2.2 - uTime * 0.1));
  float distortedAngle = angle + (movingNoise - 0.5) * uDistortion;

  float raysA = sin(distortedAngle * 18.0 + uTime * 0.9 + movingNoise * 3.4) * 0.5 + 0.5;
  float raysB = sin(distortedAngle * 31.0 - uTime * 1.15 + movingNoise * 2.3) * 0.5 + 0.5;
  float rays = pow(raysA, 4.8) * 0.74 + pow(raysB, 8.0) * 0.48;

  float textureNoise = mix(1.0, 0.72 + noise(uv * uResolution.xy * 0.42) * 0.56, uNoiseAmount);
  float lengthFade = 1.0 - smoothstep(uRayLength * 0.3, uRayLength, distanceToOrigin);
  float softFade = 1.0 - smoothstep(0.0, uFadeDistance, distanceToOrigin);
  float pulse = mix(1.0, 0.72 + 0.28 * sin(uTime * 2.0), uPulsating);

  float alpha = clamp(rays * cone * lengthFade * softFade * textureNoise * pulse, 0.0, 0.92);
  vec3 color = saturateColor(uRaysColor, uSaturation);

  gl_FragColor = vec4(color, alpha);
}
`

function originToVector(origin: RaysOrigin): [number, number] {
    switch (origin) {
        case "top-left":
            return [-0.12, 1.04]
        case "top-right":
            return [1.12, 1.04]
        case "left":
            return [-0.12, 0.5]
        case "right":
            return [1.12, 0.5]
        case "center":
            return [0.5, 0.5]
        case "top-center":
        default:
            return [0.5, 1.08]
    }
}

function originToDirection(origin: RaysOrigin): [number, number] {
    switch (origin) {
        case "top-left":
            return [0.7, -1]
        case "top-right":
            return [-0.7, -1]
        case "left":
            return [1, 0]
        case "right":
            return [-1, 0]
        case "center":
            return [0, -1]
        case "top-center":
        default:
            return [0, -1]
    }
}

export default function LightRays({
    raysOrigin = "top-center",
    raysColor = "#19d78c",
    raysSpeed = 1,
    lightSpread = 0.72,
    rayLength = 1.35,
    pulsating = false,
    fadeDistance = 1.35,
    saturation = 1,
    followMouse = false,
    mouseInfluence = 0.08,
    noiseAmount = 0.08,
    distortion = 0.04,
    className,
}: LightRaysProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mouseRef = useRef<[number, number]>([0, 0])
    const baseOrigin = useMemo(() => originToVector(raysOrigin), [raysOrigin])
    const direction = useMemo(() => originToDirection(raysOrigin), [raysOrigin])

    useEffect(() => {
        const container = containerRef.current
        if (!container) {
            return
        }

        let animationFrame = 0
        let renderer: Renderer | null = null

        try {
            renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, 2) })
        } catch {
            return
        }

        const gl = renderer.gl
        gl.clearColor(0, 0, 0, 0)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
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
                uOrigin: { value: [...baseOrigin] },
                uDirection: { value: [...direction] },
                uRaysColor: { value: new Color(raysColor) },
                uLightSpread: { value: lightSpread },
                uRayLength: { value: rayLength },
                uPulsating: { value: pulsating ? 1 : 0 },
                uFadeDistance: { value: fadeDistance },
                uSaturation: { value: saturation },
                uNoiseAmount: { value: noiseAmount },
                uDistortion: { value: distortion },
            },
        })
        const mesh = new Mesh(gl, { geometry, program })

        const resize = () => {
            const width = Math.max(container.clientWidth, 1)
            const height = Math.max(container.clientHeight, 1)
            renderer?.setSize(width, height)
            ;(program.uniforms.uResolution.value as number[]) = [width, height]
        }

        const updateMouse = (event: PointerEvent) => {
            if (!followMouse) {
                return
            }

            const rect = container.getBoundingClientRect()
            const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5
            const y = 0.5 - (event.clientY - rect.top) / Math.max(rect.height, 1)
            mouseRef.current = [x, y]
        }

        const update = (frameTime: number) => {
            const [mouseX, mouseY] = mouseRef.current
            const origin = program.uniforms.uOrigin.value as number[]

            origin[0] = baseOrigin[0] + mouseX * mouseInfluence
            origin[1] = baseOrigin[1] + mouseY * mouseInfluence
            program.uniforms.uTime.value = frameTime * 0.001 * raysSpeed

            renderer?.render({ scene: mesh })
            animationFrame = requestAnimationFrame(update)
        }

        resize()
        window.addEventListener("resize", resize)
        window.addEventListener("pointermove", updateMouse, { passive: true })
        animationFrame = requestAnimationFrame(update)

        return () => {
            window.removeEventListener("resize", resize)
            window.removeEventListener("pointermove", updateMouse)
            cancelAnimationFrame(animationFrame)
            if (gl.canvas.parentNode === container) {
                container.removeChild(gl.canvas)
            }
            gl.getExtension("WEBGL_lose_context")?.loseContext()
        }
    }, [
        baseOrigin,
        direction,
        distortion,
        fadeDistance,
        followMouse,
        lightSpread,
        mouseInfluence,
        noiseAmount,
        pulsating,
        rayLength,
        raysColor,
        raysSpeed,
        saturation,
    ])

    return <div ref={containerRef} className={cn("relative h-full w-full overflow-hidden", className)} aria-hidden="true" />
}
