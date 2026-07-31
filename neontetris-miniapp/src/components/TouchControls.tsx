'use client';

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onHold: () => void;
}

/** On-screen D-pad style controls for mobile Farcaster clients (no keyboard). */
export function TouchControls(props: TouchControlsProps) {
  const btn = 'select-none rounded-lg border border-neon-cyan/40 bg-panel/70 py-3 text-sm font-display text-neon-cyan active:bg-neon-cyan/20 shadow-neon-sm';
  return (
    <div className="grid grid-cols-4 gap-2 sm:hidden">
      <button className={btn} onClick={props.onLeft}>◀</button>
      <button className={btn} onClick={props.onRotate}>⟳</button>
      <button className={btn} onClick={props.onRight}>▶</button>
      <button className={btn} onClick={props.onHold}>Hold</button>
      <button className={`${btn} col-span-3`} onClick={props.onSoftDrop}>Soft Drop</button>
      <button className={btn} onClick={props.onHardDrop}>Drop</button>
    </div>
  );
}
