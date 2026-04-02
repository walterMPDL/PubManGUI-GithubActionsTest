import { Component } from '@angular/core';
import { TranslatePipe } from "@ngx-translate/core";
import { version } from "../../../../package.json"

@Component({
  selector: 'pure-footer',
  templateUrl: './footer.component.html',
  standalone: true,
  imports: [TranslatePipe]
})
export class FooterComponent {
  protected linkDisclaimer: string = 'disclaimer';
  protected linkPrivacy: string = 'privacy-policy';
  protected linkCookies: string = "";
  protected linkPubman: string = 'https://github.com/MPDL/InGe';
  protected linkMpdl: string = 'https://mpdl.mpg.de';

  appVersion: string = version;

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
