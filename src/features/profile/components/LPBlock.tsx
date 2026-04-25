import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { stageLabel, fmtCr, fmtChequeRange } from '@/features/search/lib/labels';
import { InfoRow } from './InfoRow';
import type { LPBlock } from '@/features/profile/schemas';

interface Props {
  block: LPBlock;
  isMasked: boolean;
}

export function LPProfileBlock({ block, isMasked }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment profile</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <InfoRow label="Fund" value={block.fund_name} isMasked={isMasked} />
        <InfoRow
          label="AUM"
          value={block.aum_cr != null ? fmtCr(block.aum_cr) : null}
          isMasked={isMasked}
        />
        <InfoRow
          label="Cheque range"
          value={
            block.cheque_range_min != null || block.cheque_range_max != null
              ? fmtChequeRange(block.cheque_range_min ?? null, block.cheque_range_max ?? null)
              : null
          }
          isMasked={isMasked}
        />
        <InfoRow
          label="Co-invest"
          value={
            block.co_invest_interest === null || block.co_invest_interest === undefined
              ? null
              : block.co_invest_interest
                ? 'Open to co-investing'
                : 'Solo investor'
          }
          isMasked={isMasked}
        />
        <InfoRow
          label="Sectors"
          value={block.sectors && block.sectors.length > 0 ? block.sectors.join(', ') : null}
          isMasked={isMasked}
        />
        <InfoRow
          label="Stages"
          value={
            block.stages && block.stages.length > 0
              ? block.stages.map((s) => stageLabel(s)).join(', ')
              : null
          }
          isMasked={isMasked}
        />
        <div className="sm:col-span-2">
          <InfoRow
            label="Geography"
            value={
              block.geography && block.geography.length > 0 ? block.geography.join(', ') : null
            }
            isMasked={isMasked}
          />
        </div>
      </CardContent>
    </Card>
  );
}
