import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '@/components/SettingsPanel';
import {
  DEFAULT_SETTINGS,
  HandwritingSettings,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
  HANDWRITING_FONTS,
} from '@/lib/types';

describe('SettingsPanel', () => {
  it('shows error for invalid custom font file', async () => {
    const user = userEvent.setup({ applyAccept: false });

    function Harness() {
      const [settings, setSettings] = React.useState<HandwritingSettings>(DEFAULT_SETTINGS);
      const [pageSettings, setPageSettings] = React.useState<PageSettings>(
        defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)
      );

      return (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          pageSettings={pageSettings}
          onPageSettingsChange={setPageSettings}
          currentPageIndex={0}
        />
      );
    }

    render(<Harness />);

    const uploadLabel = screen.getByText('Upload TTF or OTF').closest('label');
    const input = uploadLabel?.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const file = new File(['x'], 'bad.woff', { type: 'font/woff' });
    await user.upload(input as HTMLInputElement, file);

    expect(await screen.findByText('Please upload a .ttf or .otf font file.')).toBeInTheDocument();
  });

  it('removes custom font and resets fontFamily if currently custom', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [settings, setSettings] = React.useState<HandwritingSettings>({
        ...DEFAULT_SETTINGS,
        fontFamily: 'custom',
        customFont: {
          name: 'MyFont.ttf',
          family: 'MyFont',
          dataUrl: 'data:font/ttf;base64,AAA',
          format: 'truetype',
        },
      });

      const [pageSettings, setPageSettings] = React.useState<PageSettings>(
        defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)
      );

      return (
        <>
          <div data-testid="fontFamily">{settings.fontFamily}</div>
          <div data-testid="customFont">{settings.customFont ? 'yes' : 'no'}</div>
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            pageSettings={pageSettings}
            onPageSettingsChange={setPageSettings}
            currentPageIndex={0}
          />
        </>
      );
    }

    render(<Harness />);

    await user.click(screen.getByTitle('Remove custom font'));

    expect(screen.getByTestId('customFont')).toHaveTextContent('no');
    expect(screen.getByTestId('fontFamily')).toHaveTextContent(HANDWRITING_FONTS[0].value);
  });
});
