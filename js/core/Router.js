import { eventBus } from './EventBus.js';

export class Router {
    constructor() {
        this.routes = {};
        this.currentView = null;

        // Listen for navigation events
        eventBus.on('navigate', (route) => this.navigateTo(route));
    }

    register(name, viewElementId) {
        this.routes[name] = document.getElementById(viewElementId);
    }

    navigateTo(name) {
        console.log(`Navigating to: ${name}`);

        // Hide all views
        Object.values(this.routes).forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Show target view
        const target = this.routes[name];
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('fade-in');
            this.currentView = name;
            eventBus.emit('viewChanged', name);
        } else {
            console.error(`Route not found: ${name}`);
        }
    }
}
