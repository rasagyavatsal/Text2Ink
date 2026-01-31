import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HandwritingEditor from '@/components/HandwritingEditor';
import {
  DEFAULT_SETTINGS,
  HandwritingSettings,
  PageSettings,
  TextField,
  defaultPageSettingsFromHandwritingSettings,
} from '@/lib/types';

describe('HandwritingEditor', () => {
  it('renders placeholder then hides it after typing', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [text, setText] = React.useState('');
      const [settings, setSettings] = React.useState<HandwritingSettings>(DEFAULT_SETTINGS);
      const [pageSettingsByPage] = React.useState<PageSettings[]>([
        defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      ]);
      const [textFields, setTextFields] = React.useState<TextField[]>([]);
      const [previewScale, setPreviewScale] = React.useState(1);
      const [currentPageIndex, setCurrentPageIndex] = React.useState(0);

      return (
        <HandwritingEditor
          text={text}
          onTextChange={setText}
          settings={settings}
          onSettingsChange={setSettings}
          pageSettingsByPage={pageSettingsByPage}
          previewScale={previewScale}
          onPreviewScaleChange={setPreviewScale}
          textFields={textFields}
          onTextFieldsChange={setTextFields}
          currentPageIndex={currentPageIndex}
          onCurrentPageChange={setCurrentPageIndex}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByText('Click here to start typing...')).toBeInTheDocument();

    const input = screen.getByLabelText('Handwriting text input');
    await user.type(input, 'Hello');

    expect((input as HTMLTextAreaElement).value).toBe('Hello');
    expect(screen.queryByText('Click here to start typing...')).not.toBeInTheDocument();
  });

  it('adds text field when in text field mode and page clicked', async () => {
    const user = userEvent.setup();

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123);

    function Harness() {
      const [text, setText] = React.useState('');
      const [settings, setSettings] = React.useState<HandwritingSettings>(DEFAULT_SETTINGS);
      const [pageSettingsByPage] = React.useState<PageSettings[]>([
        defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
      ]);
      const [textFields, setTextFields] = React.useState<TextField[]>([]);
      const [previewScale, setPreviewScale] = React.useState(1);
      const [currentPageIndex, setCurrentPageIndex] = React.useState(0);

      return (
        <HandwritingEditor
          text={text}
          onTextChange={setText}
          settings={settings}
          onSettingsChange={setSettings}
          pageSettingsByPage={pageSettingsByPage}
          previewScale={previewScale}
          onPreviewScaleChange={setPreviewScale}
          textFields={textFields}
          onTextFieldsChange={setTextFields}
          currentPageIndex={currentPageIndex}
          onCurrentPageChange={setCurrentPageIndex}
        />
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Text Field' }));
    await user.click(screen.getByRole('button', { name: 'Page 1' }));

    expect(screen.getByRole('group', { name: 'Text field tf-123' })).toBeInTheDocument();

    nowSpy.mockRestore();
  });
});
