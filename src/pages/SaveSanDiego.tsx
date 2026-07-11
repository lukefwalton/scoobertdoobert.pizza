import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { SaveSanDiego as SaveSanDiegoGame } from '../components/SaveSanDiego';

// /save-san-diego — the cabinet front door for "1101 (Save San Diego)," Scoobert's
// real Twine quest (public/1101.html; also the hidden terminal `1101` egg). Shares
// the ArcadeCabinetPage shell + progressive-enhancement contract with the other
// cabinets, the live iframe only mounts after hydration, so the JS-off page is a
// real crawlable document with a working "back to storefront" anchor.
export default function SaveSanDiego() {
  return (
    <ArcadeCabinetPage
      slug="save-san-diego"
      title="Save San Diego · Scoobert Doobert"
      neon="SAVE SAN DIEGO"
      description="1101 (Save San Diego), a choose-your-path text quest: help Scoobert Doobert save the city (and its burritos) from an evil warlock."
      coldTitle="SAVE SAN DIEGO"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="A choose-your-path story game, type your name, read along, and pick where it goes. No score, just the quest. (The same tale the terminal's 1101 command opens.)"
    >
      <SaveSanDiegoGame />
    </ArcadeCabinetPage>
  );
}
