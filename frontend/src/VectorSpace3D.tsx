import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Anchor } from './api'

interface Props {
  anchors: Anchor[]
}

const STATUS_COLORS: Record<string, number> = {
  accepted: 0x00ff88,
  flagged:  0xffcc00,
  quarantined: 0xff4466,
}

export default function VectorSpace3D({ anchors }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    animId: number
    isDragging: boolean
    lastMouse: { x: number; y: number }
    sphereGroup: THREE.Group
    theta: number
    phi: number
    radius: number
  } | null>(null)

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth
    const h = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x080c14)
    scene.fog = new THREE.FogExp2(0x080c14, 0.003)

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000)
    camera.position.set(0, 60, 200)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x112233, 1.5))
    const dir = new THREE.DirectionalLight(0x00d4ff, 0.8)
    dir.position.set(100, 200, 100)
    scene.add(dir)

    // Grid
    const grid = new THREE.GridHelper(400, 30, 0x001122, 0x001122)
    grid.position.y = -80
    scene.add(grid)

    // Consensus sphere (central glowing orb)
    const consensusGeo = new THREE.SphereGeometry(10, 32, 32)
    const consensusMat = new THREE.MeshPhongMaterial({
      color: 0x00d4ff,
      emissive: 0x004466,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    })
    const consensusMesh = new THREE.Mesh(consensusGeo, consensusMat)
    consensusMesh.name = 'consensus'

    // Glow ring around consensus
    const ringGeo = new THREE.TorusGeometry(14, 0.5, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.4 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.name = 'ring'

    const sphereGroup = new THREE.Group()
    sphereGroup.add(consensusMesh)
    sphereGroup.add(ring)
    scene.add(sphereGroup)

    // Stars
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(3000)
    for (let i = 0; i < 3000; i++) {
      starPos[i] = (Math.random() - 0.5) * 1200
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x334455, size: 0.8, sizeAttenuation: true })
    scene.add(new THREE.Points(starGeo, starMat))

    // Mouse controls
    let isDragging = false
    let lastMouse = { x: 0, y: 0 }
    let theta = 0
    let phi = Math.PI / 6
    let radius = 220

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      lastMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - lastMouse.x
      const dy = e.clientY - lastMouse.y
      theta -= dx * 0.005
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + dy * 0.005))
      lastMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      radius = Math.max(80, Math.min(600, radius + e.deltaY * 0.3))
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel)

    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Orbit camera
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta)
      camera.position.y = radius * Math.cos(phi)
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta)
      camera.lookAt(0, 0, 0)

      // Rotate ring
      const ringMesh = sphereGroup.getObjectByName('ring')
      if (ringMesh) ringMesh.rotation.z += 0.005

      // Pulse consensus
      const t = Date.now() * 0.001
      const cMesh = sphereGroup.getObjectByName('consensus')
      if (cMesh) {
        cMesh.scale.setScalar(1 + 0.05 * Math.sin(t * 1.5))
      }

      // Auto-rotate when not dragging
      if (!isDragging) {
        theta += 0.003
      }

      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = {
      scene, camera, renderer, animId, isDragging, lastMouse,
      sphereGroup, theta, phi, radius,
    }

    const onResize = () => {
      if (!mount) return
      const w2 = mount.clientWidth
      const h2 = mount.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Update anchor points when data changes
  useEffect(() => {
    const ctx = sceneRef.current
    if (!ctx) return
    const { scene } = ctx

    // Remove old anchor group
    const old = scene.getObjectByName('anchors')
    if (old) scene.remove(old)

    const group = new THREE.Group()
    group.name = 'anchors'

    anchors.forEach((a) => {
      const [x, y, z] = a.viz_position
      const color = STATUS_COLORS[a.status] ?? 0x8899aa
      const size = a.status === 'quarantined' ? 4 : a.status === 'flagged' ? 3.5 : 2.8

      const geo = new THREE.SphereGeometry(size, 8, 8)
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: a.status === 'quarantined' ? 0.6 : 0.3,
        transparent: true,
        opacity: a.status === 'quarantined' ? 0.95 : 0.8,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      group.add(mesh)

      // Line from anchor to consensus
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(0, 0, 0),
      ])
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: a.status === 'accepted' ? 0.08 : 0.25,
      })
      group.add(new THREE.Line(lineGeo, lineMat))
    })

    scene.add(group)
  }, [anchors])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>Latent space visualization</span>
        {[
          { label: 'Accepted', color: '#00ff88' },
          { label: 'Flagged', color: '#ffcc00' },
          { label: 'Quarantined', color: '#ff4466' },
          { label: 'Consensus', color: '#00d4ff' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {anchors.length} anchors · drag to orbit · scroll to zoom
        </span>
      </div>

      {/* 3D Canvas */}
      <div
        ref={mountRef}
        style={{
          flex: 1,
          minHeight: 400,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          cursor: 'grab',
          position: 'relative',
        }}
      />

      {anchors.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Run a simulation cycle to populate the latent space
          </p>
        </div>
      )}
    </div>
  )
}
