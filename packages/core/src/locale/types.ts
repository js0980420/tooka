export type Plural = { one: string; other: string };

export type Locale = {
  id: 'zh-TW' | 'en' | 'zh-CN';

  common: {
    cancel: string;
    save: string;
    saving: string;
    saved: string;
    discard: string;
    delete: string;
    rename: string;
    move: string;
    close: string;
    loading: string;
    loadFailed: string;
    failedToLoadSlide: string;
    home: string;
    backToHome: string;
    preview: string;
    add: string;
    done: string;
    tryAgain: string;
    undo: string;
    redo: string;
    light: string;
    dark: string;
    system: string;
    selected: string;
  };

  notFound: {
    eyebrow: string;
    title: string;
  };

  home: {
    appTitle: string;
    draft: string;
    duplicate: string;
    templates: string;
    assets: string;
    connects: string;
    prompts: string;
    publish: string;
    tutorials: string;
    sidebarWorkflow: string;
    sidebarResources: string;
    resizeSidebar: string;
    folders: string;
    slides: string;
    menu: string;
    newFolder: string;
    folderName: string;
    updateAvailable: string;
    updatePackage: string;
    updatingPackage: string;
    updatePackageDone: string;
    updatePackageFailed: string;
    restartServer: string;
    restartingServer: string;
    contactSupport: string;
    lineOfficialAccount: string;
    opensInNewWindow: string;
    restartServerFailed: string;
    changeIcon: string;
    iconEmojiTab: string;
    iconColorTab: string;
    folderActions: string;
    searchPlaceholder: string;
    clearSearch: string;
    sortLabel: string;
    sortByCreatedDesc: string;
    sortByCreatedAsc: string;
    sortByTitleAsc: string;
    sortByTitleDesc: string;
    noMatches: string;
    nothingMatchesPrefix: string;
    nothingMatchesSuffix: string;
    noSlidesYet: string;
    draftEmptyTitle: string;
    emptyTemplatesHint: string;
    goToTemplates: string;
    folderEmptyTitle: string;
    folderEmptyHint: string;
    slideActions: string;
    moveToFolder: string;
    renameDialogEyebrow: string;
    renameDialogTitle: string;
    renameDialogDescription: string;
    slideNamePlaceholder: string;
    moveDialogEyebrow: string;
    moveDialogTitle: string;
    moveDialogDescriptionPrefix: string;
    moveDialogDescriptionSuffix: string;
    deleteDialogEyebrow: string;
    deleteDialogTitle: string;
    deleteDialogDescriptionPrefix: string;
    deleteDialogDescriptionMid: string;
    deleteDialogDescriptionSuffix: string;
    /** template: "Created folder “{name}”" */
    toastFolderCreated: string;
    toastFolderCreateFailed: string;
    /** template: "Duplicated “{slide}” as {newSlide}" */
    toastSlideDuplicated: string;
    toastSlideDuplicateFailed: string;
    /** template: "Moved “{slide}” to {folder}" */
    toastSlideMoved: string;
    toastSlideMoveFailed: string;
    /** template: "Deleted folder “{name}”" */
    toastFolderDeleted: string;
    toastFolderDeleteFailed: string;
    toastFolderReorderFailed: string;
    pickIcon: string;
    addToCards: string;
    /** template: "Added to “{folder}”" */
    toastPromoted: string;
    toastPromoteFailed: string;
    goToDraft: string;
    allEmptyWithDraftsTitle: string;
    allEmptyWithDraftsHint: string;
  };

  slide: {
    home: string;
    backToHome: string;
    agentConnected: string;
    agentConnectedTooltip: string;
    agentDisconnected: string;
    agentDisconnectedTooltip: string;
    download: string;
    preview: string;
    copyLink: string;
    moreActions: string;
    toastCopyLinkSuccess: string;
    toastCopyLinkFailed: string;
    exportAsPdf: string;
    exportAsPng: string;
    pdfExportFailed: string;
    pngExportFailed: string;
    pdfExportSafariUnsupported: string;
    present: string;
    presentMenuAria: string;
    presentInWindow: string;
    presentFullscreen: string;
    presentPresenter: string;
    slidesTab: string;
    assetsTab: string;
    renameSlide: string;
    nextPageAria: string;
    prevPageAria: string;
    loadingEyebrow: string;
    loadingAssetsEyebrow: string;
    emptyEyebrow: string;
    nothingToShow: string;
    emptyHintPrefix: string;
    emptyHintMust: string;
    emptyHintSuffix: string;
  };

  presenter: {
    eyebrow: string;
    notLinked: string;
    nowShowing: string;
    upNext: string;
    lastSlide: string;
    endOfDeck: string;
    speakerNotes: string;
    noNotesPrefix: string;
    noNotesSuffix: string;
    blackScreen: string;
    whiteScreen: string;
    prev: string;
    next: string;
    black: string;
    white: string;
    reset: string;
    resetTimer: string;
    currentTime: string;
    elapsed: string;
    jump: string;
    /** template: "Loading {slideId}…" */
    loadingSlide: string;
    loadingAssets: string;
  };

  present: {
    prevSlideAria: string;
    nextSlideAria: string;
    overviewAria: string;
    blackoutAria: string;
    whiteoutAria: string;
    laserAria: string;
    presenterAria: string;
    enterFullscreenAria: string;
    exitFullscreenAria: string;
    helpAria: string;
    exitAria: string;
    elapsedTime: string;
    helpEyebrow: string;
    helpTitle: string;
    shortcutNext: string;
    shortcutPrev: string;
    shortcutFirstLast: string;
    shortcutJump: string;
    shortcutOverview: string;
    shortcutBlack: string;
    shortcutWhite: string;
    shortcutLaser: string;
    shortcutPresenter: string;
    shortcutToggleHelp: string;
    shortcutCloseExit: string;
    overviewDialogAria: string;
    overviewEyebrow: string;
    /** template: "Go to slide {n}" */
    overviewGoToAria: string;
    nowBadge: string;
  };

  inspector: {
    inspect: string;
    deselect: string;
    agentWatching: string;
    agentWatchingTooltip: string;
    agentNotWatching: string;
    agentNotWatchingTooltip: string;
    contentSection: string;
    typographySection: string;
    colorSection: string;
    textColor: string;
    backgroundColor: string;
    imageSection: string;
    imagePlaceholderSection: string;
    elementTextPlaceholder: string;
    sizeLabel: string;
    weightLabel: string;
    weightLight: string;
    weightRegular: string;
    weightMedium: string;
    weightSemibold: string;
    weightBold: string;
    weightExtrabold: string;
    styleLabel: string;
    boldAria: string;
    italicAria: string;
    lineHeightLabel: string;
    trackingLabel: string;
    alignLabel: string;
    clearAria: string;
    replace: string;
    replaceImageDialogTitle: string;
    /** template: "Pick an asset from {path}." */
    replaceImageDescription: string;
    pickerLoading: string;
    pickerEmpty: string;
    placeholderHintLabel: string;
    crop: string;
    cropDialogTitle: string;
    cropDialogDescription: string;
    cropFitCover: string;
    cropFitContain: string;
    cropApply: string;
    cropResetAria: string;
    leaveComment: string;
    commentPlaceholder: string;
    commentShortcutHint: string;
    addComment: string;
    /** templates: "{count} unsaved change" / "{count} unsaved changes" */
    unsavedChanges: Plural;
    /** templates: "{count} comment" / "{count} comments" */
    commentsCount: Plural;
    /** template: "line {n}" */
    commentLineLabel: string;
    commentsEmpty: string;
    commentsApplyHintPrefix: string;
    commentsApplyHintSuffix: string;
    commentDeleteAria: string;
    /** Prefix for the toast shown when one or more buffered edits fail to write to disk. */
    saveFailed: string;
  };

  stylePanel: {
    designTokens: string;
    draftBadge: string;
    unsavedTitle: string;
    closePanelAria: string;
    colorsSection: string;
    typographySection: string;
    shapeSection: string;
    backgroundLabel: string;
    textLabel: string;
    accentLabel: string;
    displayFontLabel: string;
    bodyFontLabel: string;
    heroLabel: string;
    bodyLabel: string;
    radiusLabel: string;
    designToggle: string;
    designToggleTitle: string;
    fontPresetCustom: string;
    shuffleAria: string;
    shuffleTitle: string;
  };

  asset: {
    devOnlyMessage: string;
    sectionAria: string;
    eyebrow: string;
    scopeSlide: string;
    scopeGlobal: string;
    /** templates: "{count} file" / "{count} files" */
    fileCount: Plural;
    createdAt: string;
    modifiedAt: string;
    nameColumn: string;
    typeColumn: string;
    sizeColumn: string;
    statusColumn: string;
    sortAria: string;
    /** template: "Sort by {column}" */
    sortByColumn: string;
    sortAscending: string;
    sortDescending: string;
    assetSearchPlaceholder: string;
    clearAssetSearch: string;
    usageFilterAria: string;
    usageAll: string;
    usageUsed: string;
    usageUnused: string;
    typeFilterAria: string;
    typeAll: string;
    typeImage: string;
    typeFont: string;
    typeVideo: string;
    typeOther: string;
    gridViewAria: string;
    listViewAria: string;
    gridColumnsAria: string;
    /** template: "{count} columns" */
    gridColumnsValue: string;
    noMatchingAssets: string;
    noMatchingAssetsHint: string;
    clearFilters: string;
    searchLogos: string;
    upload: string;
    dropToUpload: string;
    loading: string;
    noAssetsYet: string;
    noAssetsHintPrefix: string;
    noAssetsHintSuffix: string;
    nameAlreadyExists: string;
    /** template: "Preview {name}" */
    previewAria: string;
    /** template: "Actions for {name}" */
    actionsAria: string;
    previewMenuItem: string;
    renameMenuItem: string;
    deleteMenuItem: string;
    conflictTitle: string;
    /** template: "{name} is already in the assets folder." */
    conflictDescription: string;
    conflictReplace: string;
    conflictRenameCopy: string;
    deleteAssetTitle: string;
    /** template: "Delete {name}? Imports referencing this file in the slide will break." */
    deleteAssetDescription: string;
    /** template: "{name} is used in {count} place across {slides} slide." (singular/plural via {count}/{slides}) */
    deleteAssetInUseDescription: string;
    deleteAssetInUseHint: string;
    deleteAndRevert: string;
    /** template: "Couldn't revert usage in {slideId}." */
    toastRevertFailed: string;
    /** template: "Deleted {name} and reverted {count} usage." */
    toastDeletedWithRevert: string;
    noPreview: string;
    previewTabOriginal: string;
    previewTabCanvas: string;
    /** template: "Canvas {w} × {h}" */
    canvasFrameLabel: string;
    /** template: "{w} × {h} px" */
    imageDimsLabel: string;
    canvasFitExact: string;
    canvasFitRatio: string;
    canvasFitMismatch: string;
    canvasFitLowRes: string;
    importHintComment: string;
    importHintSemi: string;
    logoSearchTitle: string;
    logoSearchPoweredByPrefix: string;
    logoSearchPlaceholder: string;
    logoSearchErrorTitle: string;
    logoSearchErrorBody: string;
    /** template: 'No logos for "{query}"' */
    logoSearchNoResults: string;
    logoSearchEmpty: string;
    logoSearchEmptyHintPrefix: string;
    logoSearchEmptyHintSuffix: string;
    logoVariantLight: string;
    logoVariantDark: string;
    /** template: "Upload failed ({status})" */
    toastUploadFailed: string;
    /** template: "Replaced {name}" */
    toastReplaced: string;
    /** template: "Uploaded as {name}" */
    toastUploadedAs: string;
    /** template: "Uploaded {name}" */
    toastUploaded: string;
    /** template: "Rename failed ({status})" */
    toastRenameFailed: string;
    /** template: "Renamed to {name}" */
    toastRenamed: string;
    /** template: "Delete failed ({status})" */
    toastDeleteFailed: string;
    /** template: "Deleted {name}" */
    toastDeleted: string;
    toastDownloadFailed: string;
    toastSearchFailed: string;
  };

  thumbnailRail: {
    pages: string;
    /** template: "Go to page {n}" */
    goToPageAria: string;
    duplicatePage: string;
    deletePage: string;
    /** template: "Page {n} actions" */
    pageActionsAria: string;
    /** template: "Duplicated page {n}" */
    toastDuplicated: string;
    /** template: "Deleted page {n}" */
    toastDeleted: string;
    toastDuplicateFailed: string;
    toastDeleteFailed: string;
    resizeRail: string;
    transitionIndicator: string;
    stepsIndicator: string;
    overviewAria: string;
    /** template: "Scroll up to current page {n}" */
    scrollUpToCurrentPage: string;
    /** template: "Scroll down to current page {n}" */
    scrollDownToCurrentPage: string;
  };

  pdfToast: {
    title: string;
    /** template: "Processing page {current} of {total}" */
    processing: string;
    printing: string;
    done: string;
  };

  pngToast: {
    title: string;
    /** template: "Rendering page {current} of {total}" */
    processing: string;
    generating: string;
    done: string;
  };

  themeToggle: {
    toggleAria: string;
    title: string;
    light: string;
    dark: string;
    system: string;
  };

  languageToggle: {
    toggleAria: string;
    title: string;
  };

  imagePlaceholder: {
    dropOverlay: string;
    uploading: string;
    uploadFailed: string;
  };

  notesDrawer: {
    toggle: string;
    /** template: "page {n}/{total}" */
    pageLabel: string;
    placeholder: string;
    statusSaving: string;
    statusSaved: string;
    /** template: "Save failed: {msg}" */
    statusError: string;
  };

  connects: {
    title: string;
    subtitle: string;
    instagramTitle: string;
    instagramDesc: string;
    facebookTitle: string;
    facebookDesc: string;
    facebookTokenLabel: string;
    facebookTokenPlaceholder: string;
    facebookTokenHelp: string;
    facebookPageIdLabel: string;
    facebookPageIdPlaceholder: string;
    facebookPageName: string;
    threadsTitle: string;
    threadsDesc: string;
    threadsTokenPlaceholder: string;
    threadsAccountUsername: string;
    threadsUserIdDerived: string;
    tokenSourceLabel: string;
    businessSystemUser: string;
    businessSystemUserDesc: string;
    instagramLogin: string;
    instagramLoginDesc: string;
    tokenLabel: string;
    userIdLabel: string;
    userIdDerived: string;
    tokenPlaceholder: string;
    userIdPlaceholder: string;
    connected: string;
    notConnected: string;
    needsReauth: string;
    accountId: string;
    accountUsername: string;
    tokenStatus: string;
    savedTokenLabel: string;
    save: string;
    saving: string;
    test: string;
    testing: string;
    reconnect: string;
    disconnect: string;
    cancel: string;
    showSecret: string;
    hideSecret: string;
    toastSaved: string;
    toastSaveFailed: string;
    toastInvalid: string;
    toastInvalidToken: string;
    toastMissingUserId: string;
    toastAccountMismatch: string;
    toastMissingPageId: string;
    toastFacebookInvalidToken: string;
    toastFacebookMissingPublishPermission: string;
    toastFacebookAccountMismatch: string;
    toastFacebookConnectionSuccess: string;
    toastFacebookTestFailed: string;
    toastThreadsInvalidToken: string;
    toastThreadsConnectionSuccess: string;
    toastThreadsTestFailed: string;
    confirmThreadsDisconnect: string;
    toastConnectionSuccess: string;
    toastTestFailed: string;
    toastTestError: string;
    confirmDisconnect: string;
    confirmFacebookDisconnect: string;
    toastDisconnected: string;
    toastDisconnectFailed: string;
    envNote: string;
    tutorialLink: string;
    threadsTutorialLink: string;
  };

  templates: {
    title: string;
    noTemplatesTitle: string;
    noTemplatesHintPrefix: string;
    noTemplatesHintSuffix: string;
    /** template: "Open template {name}" */
    openTemplateAria: string;
    backToGallery: string;
    visualTab: string;
    promptTab: string;
    addToCards: string;
    adding: string;
    /** template: "Added to drafts as {id}" */
    toastAdded: string;
    toastAddFailed: string;
    /** template: "page {n}/{total}" */
    pageOf: string;
    hookLabel: string;
    mainLabel: string;
    ctaLabel: string;
    taLabel: string;
    /** template: "…{name}…" — first line of the copied prompt */
    promptIntro: string;
    promptDefaultHook: string;
    promptDefaultMain: string;
    promptDefaultCta: string;
    promptDefaultTa: string;
    copyPrompt: string;
    toastCopied: string;
    toastCopyFailed: string;
    restoreDefaults: string;
    savePrompt: string;
    toastPromptSaved: string;
    savedLocallyNote: string;
  };
  publish: {
    eyebrow: string;
    title: string;
    subtitle: string;
    captureNoPages: string;
    toastSynced: string;
    resultSuccess: string;
    resultApiFailed: string;
    resultConnectionError: string;
    toastSelectSlide: string;
    toastSelectPlatform: string;
    /** template: "Fill in the {platforms} caption first!" */
    toastMissingCaptions: string;
    toastInvalidTopicTag: string;
    toastCapturing: string;
    /** template: "Captured {count} pages…" */
    toastCaptureDone: string;
    /** template: "Capture failed: {error}" */
    toastCaptureFailed: string;
    unknownError: string;
    /** template: "Publishing to {count} platforms..." */
    toastPublishingMulti: string;
    /** template: "Publishing to {platform}..." */
    toastPublishingSingle: string;
    toastAllPublished: string;
    toastOnePublished: string;
    toastSomeFailed: string;
    toastPublishFailed: string;
    stepPickCard: string;
    pickCardHint: string;
    emptyNoCards: string;
    emptyNoCardsHint: string;
    capturingCard: string;
    /** template: "Captured {count} pages" */
    captureDoneLabel: string;
    stepSyncText: string;
    applyToAll: string;
    commonTextPlaceholder: string;
    stepEditPlatforms: string;
    platformToggleHint: string;
    fbCaptionPlaceholder: string;
    igCaptionPlaceholder: string;
    igHashtagsLabel: string;
    /** template: "Tag {n}" */
    igHashtagPlaceholder: string;
    threadsTopicTagPlaceholder: string;
    threadsCaptionPlaceholder: string;
    publishing: string;
    /** template: "Publish {platform} only" */
    publishOnly: string;
    manageConnects: string;
    capturingCards: string;
    publishingAll: string;
    /** template: "Publish selected platforms ({count})" */
    publishAllButton: string;
    resultsTitle: string;
    resultSuccessBadge: string;
    resultFailedBadge: string;
    mockedNote: string;
    payloadLabel: string;
  };
  prompts: {
    title: string;
    addPrompt: string;
    listHeading: string;
    editTitle: string;
    addTitle: string;
    formTitleLabel: string;
    formTitlePlaceholder: string;
    formCategoryLabel: string;
    formCategoryPlaceholder: string;
    formContentLabel: string;
    formContentPlaceholder: string;
    defaultCategory: string;
    cancel: string;
    save: string;
    builtInBadge: string;
    copyTitle: string;
    editAction: string;
    deleteAction: string;
    tipsTitle: string;
    tipsBody: string;
    emptyState: string;
    sampleCategory: string;
    sample1Title: string;
    sample1Content: string;
    sample2Title: string;
    sample2Content: string;
    sample3Title: string;
    sample3Content: string;
    sample4Title: string;
    sample4Content: string;
    sample5Title: string;
    sample5Content: string;
  };
  tutorials: {
    pageTitle: string;
    categoryLabel: string;
  };
};
