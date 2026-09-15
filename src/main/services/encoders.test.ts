import { AppError } from '@shared/errors';

import type { RunOptions } from './process';

const run = vi.fn<(command: string, args: string[], options: RunOptions) => Promise<unknown>>();

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => 'E:/app' } }));
vi.mock('./process', () => ({ run: (...args: Parameters<typeof run>) => run(...args) }));

const { detectHardwareEncoders, resetEncoderDetection } = await import('./encoders');

beforeEach(() => {
  run.mockReset();
  resetEncoderDetection();
});

describe('detectHardwareEncoders', () => {
  it('keeps only the encoders whose probe encode succeeds', async () => {
    run.mockImplementation((_cmd, args) =>
      args.includes('h264_qsv')
        ? Promise.reject(new AppError('EXPORT_FAILED', 'no MFX session'))
        : Promise.resolve({ stdout: '', stderr: '' }),
    );
    expect(await detectHardwareEncoders()).toEqual(['h264_nvenc', 'h264_amf']);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('probes once per app run', async () => {
    run.mockResolvedValue({ stdout: '', stderr: '' });
    await detectHardwareEncoders();
    await detectHardwareEncoders();
    expect(run).toHaveBeenCalledTimes(3);
  });
});
