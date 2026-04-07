# Frontend Architecture

- `app` owns providers, routing, and top-level layout.
- `pages` assemble route-level screens.
- `features` contain user-triggered workflows such as creating a user.
- `entities` wrap server data access and view-oriented adapters.
- `shared` contains generic UI, config, and infrastructure code.
