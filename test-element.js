import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class MyElement extends LitElement {

    static get properties() {
        return {
            mood: {type: String}
        }
    }

    render() {
        return html`
            <style>
                .mood { 
                    color: green; 
                } 
            </style>
            
            Web Components are <span class="mood">${this.mood}</span>!
        `;
    }  
}

customElements.define('my-element', MyElement);