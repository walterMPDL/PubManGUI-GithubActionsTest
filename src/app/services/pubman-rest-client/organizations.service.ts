import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpOptions, SearchResult } from "./pubman-generic-rest-client.service";
import { AffiliationDbVO } from "../../model/inge";
import { PubmanSearchableGenericRestClientService } from "./pubman-searchable-generic-rest-client.service";


@Injectable({
  providedIn: 'root'
})
export class OrganizationsService extends PubmanSearchableGenericRestClientService<AffiliationDbVO>{

  constructor() {
    super('/ous');
  }


  getallChildOus(parentAffiliationIds: string[], ignoreOuId: string, opts?: HttpOptions): Observable<AffiliationDbVO[]> {
    const path = this.subPath + '/allchildren/' + ignoreOuId;
    const body = parentAffiliationIds;

    return this.httpPostJson(path, body, opts);
  }

  getTopLevelOus(opts?: HttpOptions): Observable<AffiliationDbVO[]> {
    const path = this.subPath + '/toplevel';
    return this.httpGet(path, opts);
  }

  getFirstLevelOus(opts?: HttpOptions): Observable<AffiliationDbVO[]> {
    const path = this.subPath + '/firstlevel';
    return this.httpGet(path, opts);
  }

  listChildren4Ou(id: string, opts?: HttpOptions): Observable<AffiliationDbVO[]> {
    const path = this.subPath + '/' + id + '/children';

    return this.httpGet(path, opts);
  }

  getIdPath(id: string, opts?: HttpOptions): Observable<string> {
    const path = this.subPath + '/' + id + '/idPath';

    return this.httpGet(path, opts);
  }

  getOuPath(id: string, opts?: HttpOptions): Observable<string> {
    const path = this.subPath + '/' + id + '/ouPath';

    return this.httpGet(path, opts);
  }

  getParents(id: string, opts?: HttpOptions): Observable<AffiliationDbVO[]> {
    const path = this.subPath + '/' + id + '/parents';

    return this.httpGet(path, opts);
  }

  openOu(ou: AffiliationDbVO, opts?: HttpOptions): Observable<AffiliationDbVO> {
    const path = this.subPath + '/' + ou.objectId + '/open';
    const body = ou.lastModificationDate;

    return this.httpPut(path, body, opts);
  }

  closeOu(ou: AffiliationDbVO, opts?: HttpOptions): Observable<AffiliationDbVO> {
    const path = this.subPath + '/' + ou.objectId + '/close';
    const body = ou.lastModificationDate;

    return this.httpPut(path, body, opts);
  }

  removePredecessor(ou: AffiliationDbVO, predecessorId: string, opts?: HttpOptions): Observable<AffiliationDbVO> {
    const path = this.subPath + '/' + ou.objectId + '/remove/' + predecessorId;
    const body = ou.lastModificationDate;

    return this.httpPut(path, body, opts);
  }

  addPredecessor(ou: AffiliationDbVO, predecessorId: string, opts?: HttpOptions): Observable<AffiliationDbVO> {
    const path = this.subPath + '/' + ou.objectId + '/add/' + predecessorId;
    const body = ou.lastModificationDate;

    return this.httpPut(path, body, opts);
  }

  getSuccessors(id: string): Observable<SearchResult<AffiliationDbVO>> {
    const query = {
      "size": 1000,
      query: {
        term: {
          "predecessorAffiliations.objectId": {
            value: id
          }
        }
      }
    }

    return this.search(query);

  }
}
