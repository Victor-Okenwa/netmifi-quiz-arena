import BattleRoomPage from "../page";

interface BattleResultsPageProps {
  params: Promise<{
    battleId: string;
  }>;
  searchParams: Promise<{
    spectate?: string;
  }>;
}

export default async function BattleResultsPage(props: BattleResultsPageProps) {
  return <BattleRoomPage {...props} />;
}
