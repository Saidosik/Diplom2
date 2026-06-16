"use client"

import { useEffect, useRef } from "react"
import { Color, Mesh, Program, Renderer, Triangle } from "ogl"

import { cn } from "@/lib/utils"

export interface AuroraProps {
    colorStops?: [string, string, string] | string[]
    amplitude?: number
    blend?: number
    time?: number
    speed?: number
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
uniform float uAmplitude;
uniform float uBlend;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;

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
  float amp = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float t = uTime * 0.16;
  float flow = fbm(vec2(p.x * 1.15 + t, p.y * 0.88 - t * 0.55));
  float ribbon = sin((p.x * 2.35 + flow * 2.1 + t * 1.9) * 3.14159);
  float band = 1.0 - smoothstep(0.0, 0.64, abs(p.y + ribbon * 0.24 * uAmplitude));
  float bloom = 1.0 - smoothstep(0.0, 1.46, length(p - vec2(0.12, -0.08)));

  vec3 leftMix = mix(uColorStops[0], uColorStops[1], smoothstep(-0.96, 0.48, p.x + ribbon * 0.18));
  vec3 color = mix(leftMix, uColorStops[2], smoothstep(0.2, 1.0, uv.x + flow * 0.16));

  float alpha = clamp((band * 0.68 + bloom * 0.28) * uBlend, 0.0, 0.92);
  gl_FragColor = vec4(color, alpha);
}
`

function toColorStops(colorStops: AuroraProps["colorStops"]) {
    const fallback = ["#1ad084", "#6d5cff", "#b497cf"]
    const stops = colorStops?.length ? colorStops : fallback

    return [stops[0] ?? fallback[0], stops[1] ?? fallback[1], stops[2] ?? fallback[2]]
}

export default function Aurora({
    colorStops = ["#1ad084", "#6d5cff", "#b497cf"],
    amplitude = 1,
    blend = 1,
    time,
    speed = 1.5,
    className,
}: AuroraProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) {
            return
        }

        let animationFrame = 0
        let renderer: Renderer | null = null

        try {
            renderer = new Renderer({ alpha: true, antialias: true })
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
        const stops = toColorStops(colorStops).map((stop) => new Color(stop))
        const program = new Program(gl, {
            vertex: VERTEX_SHADER,
            fragment: FRAGMENT_SHADER,
            uniforms: {
                uTime: { value: 0 },
                uAmplitude: { value: amplitude },
                uBlend: { value: blend },
                uColorStops: { value: stops },
                uResolution: { value: [1, 1] },
            },
        })
        const mesh = new Mesh(gl, { geometry, program })

        const resize = () => {
            const width = Math.max(container.clientWidth, 1)
            const height = Math.max(container.clientHeight, 1)
            renderer?.setSize(width, height)
            ;(program.uniforms.uResolution.value as number[]) = [width, height]
        }

        const update = (frameTime: number) => {
            program.uniforms.uTime.value = typeof time === "number" ? time : (frameTime * 0.001 * speed)
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
    }, [amplitude, blend, colorStops, speed, time])

    return (
        <div ref={containerRef} className={cn("relative h-full w-full overflow-hidden", className)} aria-hidden="true">
            <div
                className="absolute inset-0 opacity-70 blur-3xl"
                style={{
                    background: `radial-gradient(circle at 18% 22%, ${toColorStops(colorStops)[0]} 0%, transparent 34%), radial-gradient(circle at 58% 8%, ${toColorStops(colorStops)[1]} 0%, transparent 38%), radial-gradient(circle at 82% 28%, ${toColorStops(colorStops)[2]} 0%, transparent 32%)`,
                }}
            />
        </div>
    )
}
