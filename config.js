const { searchParams } = new URL(window.location.href);

export default /** @type {const} */ ({
    alertMethod:
        searchParams.get('alertMethod') === 'console'
            ? console.error.bind(console)
            : window.alert.bind(window),

    defaultTheme:
        searchParams.get('theme') === 'formhub' ? 'formhub' : 'material',

    experimentalOptimizations: {
        /**
         * When set to `true`, recomputations of the evaluation cascade will be performed
         * asynchronously to reduce time spent blocking UI updates. This may be improve
         * perceived performance on large forms with complex chained computations. These
         * computations are technically delayed and will perform more slowly, but their
         * corresponding UI updates will render more quickly as each step in the chain of
         * computations completes.
         */
        computeAsync: searchParams.has('computeAsync'),
    },

    /**
     * When set to `true`, non-relevant values will be treated as blank. This behavior
     * is largely consistent with JavaRosa.
     */
    excludeNonRelevant: searchParams.has('excludeNonRelevant'),

    logo: {
        source: '/odk-logo.png',
    },

    maps: [
        {
            tiles: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            name: 'streets',
            attribution:
                "© <a href='http://openstreetmap.org'>OpenStreetMap</a> | <a href='www.openstreetmap.org/copyright'>Terms</a>",
        },
        {
            tiles: 'GOOGLE_SATELLITE',
            name: 'satellite',
        },
    ],
    googleApiKey: '',
    repeatOrdinals: false,
    validateContinuously: false,
    validatePage: true,
    swipePage: true,
    textMaxChars: 2000,
});
