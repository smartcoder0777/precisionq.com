import HomeLanding from "@/views/HomeLanding";
import { loadQpSettingsPagePayload } from "@/server/qp-settings-page";

export default async function Home() {
  const payload = await loadQpSettingsPagePayload();
  return (
    <HomeLanding
      bgStatus={payload.settings.bgStatus}
      bgImage={payload.settings.bgImage}
      bgVideo={payload.settings.bgVideo}
      footerText={payload.settings.footerText}
      words={payload.words.map((w) => ({
        id: w.id,
        text: w.display || w.code,
        color: w.color,
      }))}
    />
  );
}
