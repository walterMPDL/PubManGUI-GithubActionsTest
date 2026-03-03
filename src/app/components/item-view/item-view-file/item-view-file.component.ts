import { Component, Input } from '@angular/core';
import { FileDbVO, ItemVersionVO, OA_STATUS, Storage, Visibility } from "../../../model/inge";
import { NgbPopover, NgbTooltip } from "@ng-bootstrap/ng-bootstrap";
import { environment } from 'src/environments/environment';
import { NotEmptyPipe } from "../../../pipes/notEmpty.pipe";
import { AaService } from "../../../services/aa.service";
import { checkFileAccess, getFullItemId, isUrl } from "../../../utils/item-utils";
import { ItemsService } from "../../../services/pubman-rest-client/items.service";
import { TranslatePipe } from "@ngx-translate/core";
import { CopyButtonDirective } from "../../../directives/copy-button.directive";
import { FileSizePipe } from "../../../pipes/file-size.pipe";
import { MatomoTracker } from "ngx-matomo-client";
import {EMPTY, of} from "rxjs";
import { UpperCasePipe } from "@angular/common";
import mime from "mime";

@Component({
  selector: 'pure-item-view-file',
  standalone: true,
  imports: [
    NgbTooltip,
    NotEmptyPipe,
    NgbPopover,
    TranslatePipe,
    CopyButtonDirective,
    FileSizePipe,
    UpperCasePipe
  ],
  templateUrl: './item-view-file.component.html',
  styleUrl: './item-view-file.component.scss'
})
export class ItemViewFileComponent {

  protected ingeUri = environment.inge_uri;
  @Input({required: true}) file!: FileDbVO;
  @Input({required: true}) item!: ItemVersionVO;

  audienceInfos: any;
  fileAccessGranted = true;
  oaStatusIcon?: string;

  fileType?:string | null;

  constructor(private aaService: AaService, private itemsService: ItemsService, private matomoTracker: MatomoTracker) {
  }

  ngOnInit() {

    if(this.file?.storage === Storage.INTERNAL_MANAGED) {
      this.getAudienceInfos(this.file).subscribe(infos => {
        this.audienceInfos = infos;
        this.fileAccessGranted = this.getFileAccessGranted(this.file);
      });

      this.fileType = mime.getExtension(this.file.mimeType);

    }
    this.oaStatusIcon = this.getOaStatusIcon(this.file!);

  }

  getAudienceInfos(file: FileDbVO) {
    if(file?.visibility=== Visibility.AUDIENCE) {
      return this.itemsService.retrieveFileAuthorizationInfo(getFullItemId(this.item), file!.objectId!);
    }
    return of(undefined);
  }

  getFileAccessGranted(file: FileDbVO) {
    const genericFileAccess = checkFileAccess(file, this.item, this.aaService.principal.value);
    if(file.visibility=== Visibility.AUDIENCE) {
      const audienceAccess:boolean = this.audienceInfos?.actions?.READ_FILE || false;
      return genericFileAccess || audienceAccess;
    }
    return genericFileAccess;
  }


  getIpOrganizations(file: FileDbVO) {
    //console.log(JSON.stringify(this.audienceInfos))
    return Object.values(this.audienceInfos?.ipInfo || {});
  }


  getOaStatusIcon(file: FileDbVO): string | undefined {
    if (file) {
      switch (file.metadata?.oaStatus) {
        //case OA_STATUS.CLOSED_ACCESS: return 'open_access_gold_64.png';
        case OA_STATUS.GOLD: return 'open_access_gold_64.png'
        case OA_STATUS.GREEN: return 'open_access_green_64.png'
        case OA_STATUS.HYBRID: return 'open_access_hybrid_64.png'
        case OA_STATUS.MISCELLANEOUS: return 'open_access_miscellaneous_64.png'
        case OA_STATUS.NOT_SPECIFIED: return 'open_access_not_specified_64.png'
        case undefined: return (file.visibility === Visibility.PUBLIC || file.storage === Storage.EXTERNAL_URL) ? 'open_access_not_specified_64.png' : undefined
        default: return undefined;
      }
    }
    return undefined;
  }

  trackDownload(url: string, title: string) {
    this.matomoTracker.trackLink(url, 'download', title)
  }


  protected readonly isUrl = isUrl;
}
