import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { stageLabel, fmtCr } from '@/features/search/lib/labels';
import { InfoRow } from './InfoRow';
import type { StartupBlock } from '@/features/profile/schemas';

interface Props {
  block: StartupBlock;
  isMasked: boolean;
}

export function StartupProfileBlock({ block, isMasked }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About the company</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <InfoRow label="Company" value={block.company_name} isMasked={isMasked} />
        <InfoRow label="Sector" value={block.sector} isMasked={isMasked} />
        <InfoRow
          label="Stage"
          value={block.stage ? stageLabel(block.stage) : null}
          isMasked={isMasked}
        />
        <InfoRow label="Founded" value={block.founding_year} isMasked={isMasked} />
        <InfoRow label="Team size" value={block.team_size} isMasked={isMasked} />
        <InfoRow
          label="Asking"
          value={block.ask_amount_cr != null ? fmtCr(block.ask_amount_cr) : null}
          isMasked={isMasked}
        />
        <div className="sm:col-span-2">
          <InfoRow label="Description" value={block.description} isMasked={isMasked} />
        </div>
        <div className="sm:col-span-2">
          <InfoRow label="Traction" value={block.traction} isMasked={isMasked} />
        </div>
        <div className="sm:col-span-2">
          <InfoRow
            label="Website"
            value={
              block.website_url ? (
                <a
                  className="text-brand hover:underline"
                  href={block.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {block.website_url}
                </a>
              ) : null
            }
            isMasked={isMasked}
          />
        </div>
      </CardContent>
    </Card>
  );
}
