import { Room } from './Room';
import { Water } from './Water';
import { Boids } from './Boids';
import { Hotspots } from './Hotspots';
import { SkillOrb } from './SkillOrb';

// The beach pizza shop (ROOMS[0]) as a self-contained scene: its own lights
// (warm sun + cyan bounce), the box interior, the sea + pizza-slice school out
// the window, and the three diegetic hotspots. Bundling the lights with the room
// means each room owns its mood — the hallway can be dim without fighting the
// shop's tropical key light.
export function ShopRoom() {
  return (
    <>
      <ambientLight intensity={0.8} color="#bfe6f5" />
      <directionalLight position={[6, 12, 4]} intensity={0.9} color="#fff4e0" />
      <Room />
      <Water />
      <Boids />
      <Hotspots />
      {/* The starter skill, right in the first room: a JUMP orb floating in view
          of the spawn (which faces the sea). Walk into it → "ooo, a skill" — the
          springy exploration verb, learned before you've even left the lobby. */}
      <SkillOrb ability="jump" position={[1.5, 1.5, 1.2]} />
    </>
  );
}
