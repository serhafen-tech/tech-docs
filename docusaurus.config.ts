import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: 'Serhafen',
    tagline: 'Portal to Latin America',
    favicon: 'img/favicon.ico',

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: 'https://serhafen-tech.github.io',
    baseUrl: '/tech-docs/',

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like HTML lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en', 'es'],
    },

    presets: [
        [
            'classic',
            {
                docs: false,
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
        [
            'redocusaurus',
            {
                specs: [
                    {
                        spec: 'specs/lastmile-api.openapi.yaml',
                        route: '/api/lastmile',
                    },
                    {
                        spec: 'specs/cross-border-api.openapi.yaml',
                        route: '/api/cbt',
                    },
                    {
                        spec: 'specs/pre-alert-api.openapi.yaml',
                        route: '/api/pre-alert',
                    }
                ],
                theme: {
                    primaryColor: '#1890ff',
                },
            },
        ]
    ],

    themeConfig: {
        image: 'img/serhafen_logo.svg',
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'Serhafen',
            logo: {
                alt: 'Serhafen Logo',
                src: 'img/serhafen_logo.svg',
            },
            items: [
                {
                    type: 'dropdown',
                    label: 'Documentation',
                    position: 'left',
                    items: [
                        {
                            to: '/api/lastmile',
                            label: 'Lastmile API',
                        },
                        {
                            to: '/api/cbt',
                            label: 'Cross Border API',
                        },
                        {
                            to: '/api/pre-alert',
                            label: 'Pre-Alert API',
                        }
                    ],
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'API Documentation',
                    items: [
                        {
                            label: 'Lastmile API',
                            to: '/api/lastmile',
                        },
                        {
                            label: 'Cross Border Trade API',
                            to: '/api/cbt',
                        },
                        {
                            label: 'Pre-Alert API',
                            to: '/api/pre-alert',
                        }
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Serhafen. All rights reserved.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;

