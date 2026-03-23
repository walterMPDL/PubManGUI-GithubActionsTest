import { NgClass } from '@angular/common';
import { Component, DOCUMENT, HostListener, Inject } from '@angular/core';

@Component({
  selector: 'pure-scroll-to-top',
  standalone: true,
  imports: [NgClass],
  templateUrl: './scroll-to-top.component.html'
})
export class ScrollToTopComponent {

  windowScrolled: boolean = false;
  constructor(@Inject(DOCUMENT) private document: Document) { }
  @HostListener("window:scroll", [])
  onWindowScroll() {
    if (window.scrollY || this.document.documentElement.scrollTop || this.document.body.scrollTop > 100) {
      this.windowScrolled = true;
    }
    else if (this.windowScrolled && window.scrollY || this.document.documentElement.scrollTop || this.document.body.scrollTop < 10) {
      this.windowScrolled = false;
    }
  }

  scrollToTop() {
    const currentScroll = this.document.documentElement.scrollTop || this.document.body.scrollTop;
    if (currentScroll > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
