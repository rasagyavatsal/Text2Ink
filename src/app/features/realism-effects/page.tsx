import FeaturePage from '@/components/patterns/FeaturePage';
import { buildFeatureMetadata } from '@/lib/seo/pageMetadata';
import { productFacts } from '@/lib/seo/productFacts';

const path = '/features/realism-effects';
const title = 'Realism Effects in Text2Ink';
const description = 'Review the randomness toggle and per-character variation controls available in the Text2Ink editor.';
const spacing = productFacts.realism.variations[0].value;
const baseline = productFacts.realism.variations[1].value;
const rotation = productFacts.realism.variations[2].value;
const directAnswer = `Text2Ink realism effects are controlled by the Enable Randomness toggle and three default variation values from the editor settings: letter spacing variation ${spacing}, baseline variation ${baseline}, and rotation variation ${rotation}. When enabled, calculateRandomStyle uses the character index and line index to calculate seeded per-character spacing, baseline, and rotation offsets. When disabled, the same helper returns no transform and zero spacing, baseline, and rotation offsets.`;

export const metadata = buildFeatureMetadata({ path, title, description });

const sections = [
  {
    title: 'Randomness toggle',
    body: [
      'The editor exposes an Enable Randomness switch for handwriting variation.',
      `The default setting is ${productFacts.realism.enabledDefault ? 'enabled' : 'disabled'}.`,
      'When the switch is off, calculateRandomStyle returns transform none, marginLeft 0px, and zero numeric offsets for baseline, rotation, and spacing.',
    ],
    items: ['Enable Randomness'],
    media: [
      {
        kind: 'video',
        title: 'Per-character variation placeholder',
        description: 'Placeholder for a video showing the Enable Randomness toggle changing per-character spacing, baseline, and rotation variation.',
      },
      {
        kind: 'video',
        title: 'Randomness toggle placeholder',
        description: 'Placeholder for a video showing the enabled and disabled states of the randomness switch.',
      },
    ],
  },
  {
    title: 'Variation defaults',
    body: [
      'The default variation values come from DEFAULT_SETTINGS.randomness.',
      `Those defaults are letter spacing variation ${spacing}, baseline variation ${baseline}, and rotation variation ${rotation}.`,
    ],
    items: [
      `spacing: ${spacing}`,
      `baseline: ${baseline}`,
      `rotation: ${rotation}`,
    ],
    media: [
      {
        kind: 'video',
        title: 'Variation sliders placeholder',
        description: 'Placeholder for a video showing the spacing, baseline, and rotation variation slider controls.',
      },
    ],
  },
  {
    title: 'Seeded per-character offsets',
    body: [
      'The calculateRandomStyle helper uses the character index and line index as a seed.',
      'It returns spacing as marginLeft, baseline as translateY, and rotation as rotate for each character when randomness is enabled.',
      'The helper also returns the numeric baseline, rotation, and spacing offsets, so renderer code can apply the same seeded values consistently.',
    ],
    media: [
      {
        kind: 'video',
        title: 'Seeded offsets placeholder',
        description: 'Placeholder for a video showing stable per-character offsets generated from character and line indexes.',
      },
      {
        kind: 'video',
        title: 'Transform output placeholder',
        description: 'Placeholder for a video showing marginLeft, translateY, and rotate effects on individual characters.',
      },
    ],
  },
  {
    title: 'Where effects apply',
    body: [
      'The renderer applies these offsets to handwriting text, and movable text boxes use the same random style helper for their characters.',
      'The product facts track those two application points as renderer handwriting text and movable text boxes.',
    ],
    items: productFacts.realism.appliedBy,
    media: [
      {
        kind: 'video',
        title: 'Renderer application placeholder',
        description: 'Placeholder for a video showing realism offsets applied to renderer handwriting text.',
      },
      {
        kind: 'video',
        title: 'Text box application placeholder',
        description: 'Placeholder for a video showing the same seeded random style behavior inside movable text boxes.',
      },
    ],
  },
] as const;

const faqs = [
  {
    question: 'What does the randomness toggle change?',
    answer: 'It enables or disables seeded per-character spacing, baseline, and rotation variation.',
  },
  {
    question: 'What are the default realism variation values?',
    answer: `The defaults are spacing ${spacing}, baseline ${baseline}, and rotation ${rotation}.`,
  },
] as const;

export default function RealismEffectsFeaturePage() {
  return (
    <FeaturePage
      title={title}
      description={description}
      directAnswer={directAnswer}
      path={path}
      sections={sections}
      faqs={faqs}
    />
  );
}
