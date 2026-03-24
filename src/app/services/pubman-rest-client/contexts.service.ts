import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AccountUserDbVO, ContextDbVO } from "../../model/inge";
import { PubmanSearchableGenericRestClientService } from "./pubman-searchable-generic-rest-client.service";
import { HttpOptions } from "./pubman-generic-rest-client.service";

@Injectable({
  providedIn: 'root'
})
export class ContextsService extends PubmanSearchableGenericRestClientService<ContextDbVO>{

  constructor() {
    super('/contexts');
  }


  openContext(context: ContextDbVO, opts?: HttpOptions): Observable<ContextDbVO> {
    const path = this.subPath + '/' + context.objectId + '/open';
    const body = context.lastModificationDate;
    return this.httpPut(path, context, opts);

  }

  closeContext(context: ContextDbVO, opts?: HttpOptions): Observable<ContextDbVO> {
    const path = this.subPath + '/' + context.objectId + '/close';
    const body = context.lastModificationDate;
    return this.httpPut(path, context, opts);
  }

  getContextsForCurrentUser(role:string, user:AccountUserDbVO) {
    //let token = this.aaService.token ? this.aaService.token : undefined;
    //let user: AccountUserDbVO = this.aaService.user;
    let should: any [] = []
    let body = {
      "size": 1000,
      query: {
        bool: {
          should
        }
      }
    };
    var termCounter = 0;
    for (var i = 0; i < user.grantList?.length; i++) {
      var grant = user.grantList[i];
      /*
      console.log("userGrantType: " + grant.grantType
        + " | userGrantObjectRef: " + grant.objectRef
        + " | userGrantObjectRole: " + grant.role);

       */
      if (grant.role === role) {
        body.query.bool.should.push({"term" : {"objectId" : grant.objectRef}})
      }
    }

    //console.log('Body: ' + JSON.stringify(body));
    //console.log('Token: ' + token);
    if(body.query.bool.should.length) {
      console.log('Executing search with body: ' + JSON.stringify(body));
      return (this.search(body));
    }
    else return of(undefined);
  }



}
