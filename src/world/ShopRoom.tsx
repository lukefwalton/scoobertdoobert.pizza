import { Room } from './Room';
import { Water } from './Water';
import { Boids } from './Boids';
import { Hotspots } from './Hotspots';

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
    </>
  );
}
