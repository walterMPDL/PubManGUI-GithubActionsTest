import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { OrganizationsService } from './organizations.service';
import { AccountUserDbVO, GrantVO } from "../../model/inge";
import { PubmanSearchableGenericRestClientService } from "./pubman-searchable-generic-rest-client.service";
import { HttpOptions } from "./pubman-generic-rest-client.service";
import {HttpParams} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class UsersService extends PubmanSearchableGenericRestClientService<AccountUserDbVO>{
  organizationService: OrganizationsService = inject(OrganizationsService)


  constructor() {
    super('/users');
  }

  activate(user: AccountUserDbVO, opts?: HttpOptions): Observable<AccountUserDbVO> {
    const path = this.subPath + '/' + user.objectId + '/activate';
    const body = user.lastModificationDate;

    return this.httpPut(path, body, opts);
  }

  deactivate(user: AccountUserDbVO, opts?: HttpOptions): Observable<AccountUserDbVO> {
    const path = this.subPath + '/' + user.objectId + '/deactivate';
    const body = user.lastModificationDate;

    return this.httpPut(path, body, opts);

  }

  addGrants(user: AccountUserDbVO, grants: GrantVO[], opts?: HttpOptions): Observable<AccountUserDbVO> {
    const path = this.subPath + '/' + user.objectId + '/add';
    const body = JSON.stringify(grants);

    return this.httpPut(path, body, opts);
  }

  removeGrants(user: AccountUserDbVO, grants: GrantVO[], opts?: HttpOptions): Observable<AccountUserDbVO> {
    const path = this.subPath + '/' + user.objectId + '/remove';
    const body = JSON.stringify(grants);

    return this.httpPut(path, body, opts);
  }

  changePassword(userId: string, password: string, passwordChangeFlag: boolean, opts?: HttpOptions): Observable<AccountUserDbVO> {
    const path = this.subPath + '/' + userId + '/password';
    const body = password;
    let params: HttpParams = new HttpParams()
      .set('passwordChangeFlag', passwordChangeFlag);
    const mergedOpts = this.createOrMergeHttpOptions(opts, {params: params});

    return this.httpPutText(path, body, mergedOpts);
  }

  changePasswordOneTime(username: string, oneTimePassword: string, newPassword: string, opts?: HttpOptions): Observable<any> {
    const path = '/changepassword';
    const body = username + ':' + oneTimePassword + ':' + newPassword;
    return this.httpPostAny(path, body, opts);
  }

  generateRandomPassword(opts?: HttpOptions): Observable<string> {
    const path = this.subPath + '/generateRandomPassword';

    return this.httpGet(path, opts);
  }

  /*
  addAdditionalPropertiesOfGrantRefs(grant: GrantVO) {
    const ref = grant.objectRef;
    if (ref === undefined) {
    } else {
      if (ref.startsWith('ou')) {
        this.organizationsService.get(this.ousPath, ref, null)
          .subscribe({
            next: (data: Ou) => {
              grant.objectName = data.name;
              grant.objectStatus = data.publicStatus;
            },
            error: (e) => this.messagesService.error(e),
          });
      } else {
        if (ref.startsWith('ctx')) {
          this.contextsService.get(this.ctxsPath, ref, null)
            .subscribe({
              next: (data: Ctx) => {
                grant.objectName = data.name;
                grant.objectStatus = data.state;
              },
              error: (e) => this.messagesService.error(e),
            });
        }
      }
    }
  }

  addOuPathOfGrantRefs(grant: Grant) {
    const ref = grant.objectRef;
    if (ref === undefined) {
    } else {
      if (ref.startsWith('ou')) {
        this.organizationsService.get(this.ousPath, grant.objectRef, null)
          .subscribe({
            next: (data: Ou) => grant.parentName = data.parentAffiliation.name,
            error: (e) => this.messagesService.error(e),
          });
      } else {
        if (ref.startsWith('ctx')) {
          this.contextsService.get(this.ctxsPath, ref, null)
            .subscribe({
              next: (data: Ctx) => {
                this.organizationsService.getOuPath(data.responsibleAffiliations[0].objectId, null)
                  .subscribe({
                    next: (data: string) => grant.parentName = data,
                    error: (e) => this.messagesService.error(e),
                  });
              },
              error: (e) => this.messagesService.error(e),
            });
        }
      }
    }
  }*/
}
