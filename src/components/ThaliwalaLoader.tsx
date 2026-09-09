export function ThaliwalaLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={fullScreen ? "fixed inset-0 z-[80] grid place-items-center bg-background/85 backdrop-blur-sm" : "grid min-h-52 place-items-center"}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="thaliwala-loader">
        <div className="thaliwala-loader-ring" />
        <span>Thaliwala</span>
      </div>
    </div>
  );
}