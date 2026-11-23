# Capture pricing decision

The owner approved **USD $11.99 monthly** for Stripe test mode. The test catalog's companion annual price is **USD $107.88**, equivalent to $8.99 per month and about 25% below paying monthly for a year. Live pricing and payments remain subject to the paid launch gate. The previous proposal and early-access alternatives are shown for comparison.

## AI cost at the current allowances

CAP-056 measured 6,613 input and 3,421 output tokens across three successful public-article analyses. At $0.20 per million uncached input tokens and $1.20 per million output tokens, the total is $0.0054278, or $0.001809 per successful request. Each measured response generated notes and topic suggestions. The average excludes failed calls and retries. The planning baseline rounds up to $0.003 per published article to allow for those unmeasured calls. Treat the $0.008 stress and $0.020 adverse cases as sensitivity assumptions, not observed averages. [CAP-056 measurements](DEVELOPMENT_AGENT_PLAYBOOK.md#2026-11-23t1023110800-cap-056--integrate-real-ai-provider-server-side--complete) · [OpenAI model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

| AI-only cost                  | Illustrative Free use, 5 analyses | Free limit, 20 analyses | Illustrative Pro use, 30 analyses | Pro limit, 300 analyses |
| ----------------------------- | --------------------------------: | ----------------------: | --------------------------------: | ----------------------: |
| Baseline, $0.003 per analysis |                            $0.015 |                  $0.060 |                            $0.090 |                  $0.900 |
| Stress, $0.008 per analysis   |                            $0.040 |                  $0.160 |                            $0.240 |                  $2.400 |
| Adverse, $0.020 per analysis  |                            $0.100 |                  $0.400 |                            $0.600 |                  $6.000 |

## Payment, infrastructure, and support assumptions

- Model card payments on Stripe's published Singapore rates as a planning assumption. For USD settlement, the base case is 3.4% plus US$0.50 per charge, plus 0.7% for Billing. The fee stress case adds 0.5 percentage points for international cards and 2 percentage points when currency conversion is required. It holds the fixed USD fee constant for comparison. Confirm the actual merchant country and settlement terms before enabling live payments. Annual plans incur the fixed fee once per year in the model. [Stripe Singapore pricing](https://stripe.com/en-sg/pricing)
- Budget $144 per month for a hosted commercial setup within the modeled plan inclusions. This uses $25 for one Supabase Pro project, $20 for Vercel Pro with one deploying seat, and $99 for Inngest Pro. Extra projects, seats, hosting overages, and other paid services would increase the budget. [Supabase pricing](https://supabase.com/pricing) · [Vercel Pro plan](https://vercel.com/docs/plans/pro-plan) · [Inngest pricing](https://www.inngest.com/pricing)
- The hosted scheduler runs every minute and executes two steps even on an empty queue. Metering one run plus two steps gives approximately 129,600 executions in a 30-day month before processing any captures. Inngest lists 50,000 executions per month on Free and one million on Pro. Check actual execution counts in staging before relying on the estimate. [Dispatcher code](../apps/web/lib/inngest/dispatch.ts) · [Inngest pricing](https://www.inngest.com/pricing)
- Reserve $1.00 per paid account and $0.10 per active Free account monthly for support as planning inputs. Real support time, customer acquisition, refunds, tax, and disputes are outside this model. The estimates below are contribution scenarios.

## Pricing scenarios

All figures are USD per paid account per month. For an annual price, spread the net annual charge over 12 months. Contribution deducts payment fees, AI, and the paid-account support reserve. Fixed infrastructure and Free accounts appear in the cohort example below.

| Price            | Net after base fees | Contribution at 30 baseline analyses | Contribution at 300 baseline analyses | Contribution at 300 stress analyses and higher fees |
| ---------------- | ------------------: | -----------------------------------: | ------------------------------------: | --------------------------------------------------: |
| $11.99 monthly   |              $11.00 |                                $9.91 |                                 $9.10 |                                               $7.30 |
| $107.88 annually |               $8.58 |                                $7.49 |                                 $6.68 |                                               $4.95 |
| $7.99 monthly    |               $7.16 |                                $6.07 |                                 $5.26 |                                               $3.56 |
| $71.88 annually  |               $5.70 |                                $4.61 |                                 $3.80 |                                               $2.15 |
| $4.99 monthly    |               $4.29 |                                $3.20 |                                 $2.39 |                                               $0.76 |
| $39.99 annually  |               $3.15 |                                $2.06 |                                 $1.25 |                                              -$0.33 |

For 100 paid accounts and 400 active Free accounts, $11.99 monthly leaves about **$801** per month after modeled costs at 30 Pro and five Free analyses per account. The stress case leaves about **$482** with 300 Pro and 20 Free analyses per account and higher fees. If all paid accounts use the $107.88 annual price, the monthly equivalents are about **$559** and **$247.50** respectively. At $0.020 AI cost per analysis, full Pro use and higher fees leave about $3.70 per monthly subscriber or $1.35 per annual subscriber per month before shared infrastructure and Free-user costs.

## Recommendation and review

Test the selected USD prices with 20 Free and 300 Pro successful analyses per UTC month. The annual price gives users a discount and has a smaller contribution at high usage. Verify willingness to pay with beta users before approving live prices.

Keep the existing 20 capture requests per account per minute, the 100,000-byte submitted text limit, and the 12,000-byte evidence budget. Before accepting payment, measure AI spend divided by published notes, including failed or retried provider calls, plus job executions, usage distribution, storage, and support time. Review the pricing and caps if observed AI spend reaches the stress assumption or staging exceeds the hosting budget. [Capture quota rules](PRODUCT_SPEC.md#104-quota-rules)
