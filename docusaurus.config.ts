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
                        spec: 'specs/customs.openapi.yml',
                        route: '/api/customs',
                    },
                    {
                        spec: 'specs/lastmile.openapi.yml',
                        route: '/api/lastmile',
                    },
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
                            to: '/api/customs',
                            label: 'Customs API',
                        },
                        {
                            to: '/api/lastmile',
                            label: 'Lastmile API',
                        },
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
                            label: 'Customs API',
                            to: '/api/customs',
                        },
                        {
                            label: 'Lastmile API',
                            to: '/api/lastmile',
                        },
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

