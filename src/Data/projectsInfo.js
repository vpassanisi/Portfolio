const projects = [
  {
    id: 1,
    url: "https://bug-tracker-api.herokuapp.com/",
    github: "https://github.com/vpassanisi/Bug-Tracker-API/tree/master/client",
    title: "BugTracker",
    description:
      "An app to track bugs in your projects. You can tag a fixer to a bug and the account will automatically have that project added to their porjects page.",
    background: "./images/BugTracker-bg.jpg",
    baseIcon: "./icons/BugTracker-icon.svg",
    overlayIcon: "./icons/svelte-icon.svg",
    technologies: [
      {
        tech: "Svelte",
        link: "https://github.com/sveltejs/svelte"
      },
      {
        tech: "MaterializeCSS",
        link: "https://github.com/Dogfalo/materialize"
      },
      {
        tech: "Svelte Media Query",
        link: "https://github.com/xelaok/svelte-media-query"
      },
      {
        tech: "Rollup",
        link: "https://github.com/rollup/rollup"
      },
      {
        tech: "Svelte SPA Router",
        link: "https://github.com/ItalyPaleAle/svelte-spa-router"
      },
      {
        tech: "NPM",
        link: "https://www.npmjs.com/"
      },
      {
        tech: "HTML",
        link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      }
    ]
  },

  {
    id: 2,
    url: "https://bug-tracker-api.herokuapp.com/docs/index.html",
    github: "https://github.com/vpassanisi/Bug-Tracker-API",
    title: "BugTracker REST API",
    description: "REAST API server for BugTracker App",
    background: "./images/BugTrackerAPI-bg.jpg",
    baseIcon: "./icons/API-icon.svg",
    overlayIcon: "./icons/koajs-icon.svg",
    technologies: [
      {
        tech: "Node",
        link: "https://github.com/nodejs/node"
      },
      {
        tech: "Koa",
        link: "https://github.com/koajs/koa"
      },
      {
        tech: "MongoDB",
        link: "https://www.mongodb.com/"
      },
      {
        tech: "Mongoose",
        link: "https://github.com/Automattic/mongoose"
      },
      {
        tech: "Passport",
        link: "https://github.com/jaredhanson/passport"
      },
      {
        tech: "JWT",
        link: "https://github.com/auth0/node-jsonwebtoken"
      },
      {
        tech: "Nodemon",
        link: "https://github.com/remy/nodemon"
      },
      {
        tech: "Koa Router",
        link: "https://github.com/koajs/router"
      },
      {
        tech: "Bcrypt",
        link: "https://github.com/kelektiv/node.bcrypt.js"
      }
    ]
  },
  {
    id: 4,
    url: "https://journalll.herokuapp.com/",
    github:
      "https://github.com/vpassanisi/Gratitude-Journal_API/tree/master/client",
    title: "Journal App",
    description: "Journaling app",
    background: "./images/Journal-bg.jpg",
    baseIcon: "./icons/Journal-icon.png",
    overlayIcon: "./icons/tailwindcss-icon.svg",
    technologies: [
      {
        tech: "Svelte",
        link: "https://github.com/sveltejs/svelte"
      },
      {
        tech: "Tailwind CSS",
        link: "https://github.com/tailwindcss/tailwindcss"
      },
      {
        tech: "Smelte",
        link: "https://github.com/matyunya/smelte"
      },
      {
        tech: "Svelte SPA Router",
        link: "https://github.com/ItalyPaleAle/svelte-spa-router"
      },
      {
        tech: "Rollup",
        link: "https://github.com/rollup/rollup"
      },
      {
        tech: "NPM",
        link: "https://www.npmjs.com/"
      },
      {
        tech: "HTML",
        link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      }
    ]
  },
  {
    id: 3,
    url: "https://journalll.herokuapp.com/docs/",
    github: "https://github.com/vpassanisi/Gratitude-Journal_API",
    title: "Journal REST API",
    description: "REST API for journaling app",
    background: "./images/JournalAPI-bg.jpg",
    baseIcon: "./icons/API-icon.svg",
    overlayIcon: "./icons/expressjs-icon.svg",
    technologies: [
      {
        tech: "Node",
        link: "https://github.com/nodejs/node"
      },
      {
        tech: "Express",
        link: "https://github.com/expressjs/express"
      },
      {
        tech: "MongoDB",
        link: "https://www.mongodb.com/"
      },
      {
        tech: "Mongoose",
        link: "https://github.com/Automattic/mongoose"
      },
      {
        tech: "JWT",
        link: "https://github.com/auth0/node-jsonwebtoken"
      },
      {
        tech: "Bcrypt",
        link: "https://github.com/kelektiv/node.bcrypt.js"
      },
      {
        tech: "Nodemon",
        link: "https://github.com/remy/nodemon"
      }
    ]
  },
  {
    id: 5,
    url: "https://the-best-react-weather-app.netlify.com/",
    github: "https://github.com/vpassanisi/React-Weather-App",
    title: "Weather App",
    description:
      "A weather app. Put in any location in any format. You can change between celcius and farenheit and add any locatin to you favorites list.  all changes are saved for you and are loaded when the page loads",
    background: "./images/WeatherApp-bg.jpg",
    baseIcon: "./icons/WeatherApp-icon.svg",
    overlayIcon: "./icons/reactjs-icon.svg",
    technologies: [
      {
        tech: "React",
        link: "https://github.com/facebook/react"
      },
      {
        tech: "Tailwind CSS",
        link: "https://github.com/tailwindcss/tailwindcss"
      },
      {
        tech: "Styled Components",
        link: "https://github.com/styled-components/styled-components"
      },
      {
        tech: "Post CSS",
        link: "https://github.com/postcss/postcss"
      },
      {
        tech: "Purge CSS",
        link: "https://github.com/FullHuman/purgecss"
      }
    ]
  },
  {
    id: 6,
    url: "https://githubfinder-react-app.netlify.com/",
    github: "https://github.com/vpassanisi/github-finder",
    title: "Github-Finder",
    description:
      "Use the github user api to search for a github user and view information about them",
    background: "./images/GitHubFinder-bg.jpg",
    baseIcon: "./icons/WeatherApp-icon.svg",
    overlayIcon: "./icons/reactjs-icon.svg",
    technologies: [
      {
        tech: "React",
        link: "https://github.com/facebook/react"
      },
      {
        tech: "Axios",
        link: "https://github.com/axios/axios"
      },
      {
        tech: "React Router",
        link:
          "https://github.com/ReactTraining/react-router/tree/master/packages/react-router-dom"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      },
      {
        tech: "NPM",
        link: "https://www.npmjs.com/"
      }
    ]
  },
  {
    id: 7,
    url: "https://edgeledger-site.netlify.com/",
    github: "https://github.com/vpassanisi/EdgeLedger_Website",
    title: "EdgeLedger Website",
    description: "Simple HTML and CSS static website",
    background: "./images/EdgeLedger-bg.jpg",
    baseIcon: "",
    overlayIcon: "./icons/JQuery-icon.svg",
    technologies: [
      {
        tech: "JQuery",
        link: "https://github.com/jquery/jquery"
      },
      {
        tech: "HTML",
        link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      },
      {
        tech: "Javascript",
        link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
      }
    ]
  },
  {
    id: 8,
    url: "https://hotel-bt-site.netlify.com/",
    github: "https://github.com/vpassanisi/Hotel_BT_Website",
    title: "Hotel BT Website",
    description: "Simple HTML and CSS static website",
    background: "./images/HotelBT-bg.jpg",
    baseIcon: "",
    overlayIcon: "./icons/FA-icon.svg",
    technologies: [
      {
        tech: "Font Awesome",
        link: "https://fontawesome.com/"
      },
      {
        tech: "HTML",
        link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      }
    ]
  },
  {
    id: 9,
    url: "https://presentation-site.netlify.com/",
    github: "https://github.com/vpassanisi/Presesntation_Website",
    title: "Presentation Website",
    description: "Simple HTML and CSS static website",
    background: "./images/Presentation-bg.jpg",
    baseIcon: "",
    overlayIcon: "./icons/FA-icon.svg",
    technologies: [
      {
        tech: "Font Awesome",
        link: "https://fontawesome.com/"
      },
      {
        tech: "HTML",
        link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
      },
      {
        tech: "CSS",
        link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
      }
    ]
  }
];

export default projects;
