interface NavigationLink {
  id: string;
  view: string;
  isAnchor: boolean;
}

/** Home links follow scroll position; other links follow the current view. */
export function isNavigationLinkActive(
  link: NavigationLink,
  currentView: string,
  activeSection: string,
): boolean {
  if (currentView === 'home') {
    return link.isAnchor && activeSection === link.id;
  }
  return currentView === link.view;
}
