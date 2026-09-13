import React from "react";
import { User } from "lucide-react";
import type { ModCreditGroup } from "../../../types";

interface ModCreditsViewProps {
  credits?: ModCreditGroup[];
  authors?: string[];
  author?: string;
  className?: string;
}

/**
 * @description Renders a structured list of credits and contributors for a mod.
 * Displays groups, roles, names, and optional avatars.
 */
export const ModCreditsView: React.FC<ModCreditsViewProps> = ({
  credits,
  authors,
  author,
  className = "",
}) => {
  const effectiveGroups: ModCreditGroup[] = React.useMemo(() => {
    if (credits && credits.length > 0) {
      return credits;
    }

    if (authors && authors.length > 0) {
      return [
        {
          groupName: "Contributors",
          authors: authors.map((name) => ({
            name,
            role: name.toLowerCase() === author?.toLowerCase() ? "Lead Creator" : "Contributor",
          })),
        },
      ];
    }

    if (author) {
      return [
        {
          groupName: "Creator",
          authors: [{ name: author, role: "Author / Submitter" }],
        },
      ];
    }

    return [];
  }, [credits, authors, author]);

  if (effectiveGroups.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <User className="w-10 h-10 text-[var(--wb-on-surface-variant)] opacity-40 mb-2" />
        <span className="text-[var(--wb-on-surface-variant)] text-sm">
          No detailed contributor info available.
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 pb-6 ${className}`}>

      {effectiveGroups.map((group, groupIdx) => (
        <div key={`group-${groupIdx}`} className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-[var(--wb-primary)] uppercase tracking-wider px-1">
            {group.groupName}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.authors.map((member, mIdx) => (
              <div
                key={`member-${groupIdx}-${mIdx}`}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 transition-all hover:bg-[var(--wb-surface-bright)]"
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--wb-surface-container-high)] flex items-center justify-center shrink-0 border border-white/5 text-[var(--wb-on-surface-variant)]">
                    <User className="w-4 h-4 opacity-70" />
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-[var(--wb-on-surface)] truncate">
                    {member.name}
                  </span>
                  {member.role && (
                    <span className="text-xs text-[var(--wb-on-surface-variant)] truncate opacity-80">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
