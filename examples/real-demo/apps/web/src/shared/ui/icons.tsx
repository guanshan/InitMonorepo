type IconProps = {
  size?: number;
};

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const HomeIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z" />
  </svg>
);

export const PanelLeftIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

export const ChevronRightIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)} strokeWidth={2.5}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export const MoreHorizontalIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export const SunIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const MoonIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const MonitorIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const CheckIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)} strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const LogOutIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const KeyIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

export const GlobeIcon = ({ size = 15 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const UsersIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const SettingsIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const SearchIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const PlusIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const EditIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const TrashIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

export const RefreshIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14" />
  </svg>
);

export const PaletteIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 3-3.5 3H16a3 3 0 0 0-3 3v1.5c0 1.5-.5 2.5-1 2.5z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="9.5" cy="6.5" r="1" />
    <circle cx="14.5" cy="6.5" r="1" />
    <circle cx="17.5" cy="11" r="1" />
  </svg>
);

export const SlidersIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const MegaphoneIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M3 11l18-8v18l-18-8v-2z" />
    <path d="M3 11v4a2 2 0 0 0 2 2h2l3 6h3l-3-6" />
  </svg>
);

export const CpuIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

export const SparklesIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    <path d="M5 16l.6 1.7 1.7.6-1.7.6L5 20.7l-.6-1.7-1.7-.6 1.7-.6z" />
  </svg>
);

export const CheckCircleIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="8 12 11 15 16 9" />
  </svg>
);

export const AlertCircleIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <line x1="12" y1="16" x2="12" y2="16.5" />
  </svg>
);

export const SendIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M3 11l18-8-7 19-2-8z" />
    <path d="M3 11l8 2" />
  </svg>
);

export const EyeIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19 19 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A10 10 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-3.17 4.1" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const ZapIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const CopyIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const StopIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

export const ChevronDownIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)} strokeWidth={2.2}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronUpIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)} strokeWidth={2.2}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const DownloadIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const UploadIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)} strokeWidth={2.2}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const FlaskIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M9 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L15 9V3" />
    <line x1="9" y1="3" x2="15" y2="3" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </svg>
);

export const AlertTriangleIcon = ({ size = 14 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="17.5" />
  </svg>
);

export const ServerIcon = ({ size = 16 }: IconProps = {}) => (
  <svg {...baseProps(size)}>
    <rect x="3" y="4" width="18" height="7" rx="1.5" />
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <line x1="7" y1="7.5" x2="7.01" y2="7.5" />
    <line x1="7" y1="16.5" x2="7.01" y2="16.5" />
  </svg>
);
