import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { MessageService } from 'src/app/services/message.service';
import { environment } from 'src/environments/environment';
import { AccountUserDbVO, ContextDbVO, ItemVersionState } from "../model/inge";
import { ContextsService } from "./pubman-rest-client/contexts.service";
import {Router, RouteReuseStrategy} from "@angular/router";
import { DISPLAY_ERROR, PubManHttpErrorResponse, SILENT_LOGOUT } from "./interceptors/http-error.interceptor";
import { TranslateService } from "@ngx-translate/core";
import {PureRrs} from "./pure-rrs";


export class Principal{
  user?: AccountUserDbVO;
  loggedIn: boolean = false;
  isModerator: boolean = false;
  isDepositor: boolean = false;
  isAdmin: boolean = false;
  isLocalAdmin: boolean = false;
  isReporter: boolean = false;
  moderatorContexts: ContextDbVO[] = [];
  depositorContexts: ContextDbVO[] = [];
  allContexts: ContextDbVO[] = [];
  ipAddress?:string;
  matchedIpName?: string;
  matchedIpId?: string;

  isModeratorForContext(contextId:string): boolean {
    return this.moderatorContexts.some(contextObj => contextObj.objectId === contextId);
  }

  isDepositorForContext(contextId:string): boolean {
    return this.depositorContexts.some(contextObj => contextObj.objectId === contextId);
  }

}

@Injectable({
  providedIn: 'root'
})
export class AaService {

  private loginUrl = environment.inge_rest_uri.concat('/login');
  private logoutUrl = environment.inge_rest_uri.concat('/logout');

  principal: BehaviorSubject<Principal>;
  logout$ = new BehaviorSubject(false);


  constructor(
    private http: HttpClient,
    private contextService: ContextsService,
    private message: MessageService,
    private router: Router,
    private translate: TranslateService,
    private rrs: RouteReuseStrategy
  ) {
    const principal: Principal = new Principal();
    this.principal = new BehaviorSubject<Principal>(principal);
    //this.checkLogin();
  }

  get isLoggedIn(): boolean {
    return this.principal.getValue().loggedIn;
  }

  checkLogin(): Observable<Principal> {
    console.log("Check login");

    return this.who().pipe(
      switchMap(user => {
        let principal: Principal = new Principal();
        principal.ipAddress = user?.ipAddress;
        principal.matchedIpName = user?.matchedIpName;
        principal.matchedIpId = user?.matchedIpId;

        if (!user || !user.active) {
          this.principal.next(principal);
          return of(principal);
        }

        principal.loggedIn = true;
        principal.user = user;
        principal.isAdmin = !!user.grantList?.find((grant: any) => grant.role === 'SYSADMIN');
        principal.isLocalAdmin = !!user.grantList?.find((grant: any) => grant.role === 'LOCAL_ADMIN');
        principal.isReporter = !!user.grantList?.find((grant: any) => grant.role === 'REPORTER');
        this.logout$.next(false);

        return forkJoin([
          this.contextService.getContextsForCurrentUser("DEPOSITOR", user),
          this.contextService.getContextsForCurrentUser("MODERATOR", user)
        ]).pipe(
          map(([depositorResults, moderatorResults]) => {
            if (depositorResults) {
              principal.depositorContexts = depositorResults.records.map(rec => rec.data);
              principal.isDepositor = principal.depositorContexts.length > 0;
            }
            else {
              principal.depositorContexts = [];
            }
            if (moderatorResults) {
              principal.moderatorContexts = moderatorResults.records.map(rec => rec.data);
              principal.isModerator = principal.moderatorContexts.length > 0;
            }
            else {
              principal.moderatorContexts = [];
            }

            this.principal.next(principal);
            return principal;
          })
        );
      })
    );
  }

  login(userName: string, password: string) {
    console.log("Login with user " + userName)
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = userName + ':' + password;
    const context:HttpContext = new HttpContext().set(DISPLAY_ERROR, false);
    return this.http.request('POST', this.loginUrl, {
      body: body,
      headers: headers,
      observe: 'response',
      //responseType: 'text',
      withCredentials: true,
      context: context
    }).pipe(
      switchMap((response) => {
        if (response.status === 200) {
          return this.checkLogin();
        } else {

          return EMPTY;
        }
      }),
    );
  }

  logout(): void {
    this.http.request('GET', this.logoutUrl, {withCredentials: true, observe: "response", responseType: "text"}).pipe(
      tap(res => {
      if(res.status === 200) {
        console.log("Successfully logged out from backend");
      }
      //localStorage.clear();
        /*
      const  loggedOutprincipal = new Principal();
      loggedOutprincipal.ipAddress = this.principal.value.ipAddress;
      loggedOutprincipal.matchedIpName= this.principal.value.matchedIpName;
      loggedOutprincipal.matchedIpId = this.principal.value.matchedIpId;
      this.principal.next(loggedOutprincipal);
         */
        this.checkLogin().subscribe(res => {
          this.message.info("Logout " +this.translate.instant('common.succeeded'), true);
          this.router.navigate(['/']).then(() => {
            //Clear all handles in the router, so that the user can't access a page that is not allowed anymore.
              (this.rrs as PureRrs).clearAllHandles();
          }

          );
        })

    }),
      finalize(() => {
        this.principal.next(new Principal());
        this.logout$.next(true);
        sessionStorage.clear();
      })
    ).subscribe()

  }

  checkLoginChanged() {
    this.who(false).pipe(
      tap(user => {
        if(this.principal?.value?.user?.loginname != user?.loginname) {
          this.message.warning(this.translate.instant('common.loginChanged'),true);
          this.checkLogin().subscribe();
          this.router.navigate(['/'])
        }

        }
      )
    ).subscribe();
  }





  private who(silentLogout=true): Observable<AccountUserDbVO> {
    //const headers = new HttpHeaders().set('Authorization', token);
    const whoUrl = this.loginUrl + '/who';
    let user: any;

    return this.http.request<AccountUserDbVO>('GET', whoUrl, {
      //headers: headers,
      observe: 'body',
      withCredentials: true,
      context: new HttpContext().set(SILENT_LOGOUT, silentLogout)
    });
  }

  /**
   * Constructs and returns a query object that filters data based on the provided states
   * and the user's role and permissions.
   *
   * @param {string[]} states - An array of strings representing the desired states
   *     to filter for, such as "SUBMITTED" or "IN_REVISION".
   * @return {Object} The constructed query object formatted for filtering purposes.
   *     Returns undefined if no valid query can be constructed.
   */
  public filterOutQuery(states: string[]) {
    let moderatorQuery: any = undefined;
    let depositorQuery: any = undefined;
    const depositorStates:string[] = states.filter(state => state === ItemVersionState.PENDING.valueOf() || state === ItemVersionState.SUBMITTED.valueOf() || state === ItemVersionState.IN_REVISION.valueOf());
    const moderatorStates:string[] = states.filter(state => state === ItemVersionState.SUBMITTED.valueOf() || state === ItemVersionState.IN_REVISION.valueOf());

    if(this.principal.getValue().moderatorContexts.length > 0 && moderatorStates.length > 0)
    {
      moderatorQuery =
        {
          bool: {
            must : [
              {
                "terms": {
                  "latestVersion.versionState": moderatorStates
                }
              },
              {
                "terms": {
                  "context.objectId": this.principal.getValue().moderatorContexts.map(context => context.objectId)
              }
              }
            ]
          }
        }
    }

    if(this.principal.getValue().loggedIn && depositorStates.length > 0) {
      depositorQuery = {
        bool: {
          must : [
            {
              "terms": {
                "latestVersion.versionState": depositorStates
              }
            },
            {
              "term": {
                "creator.objectId": this.principal?.getValue()?.user?.objectId
              }
            }
          ]
        }
      }
    }

    //console.log("Moderator query: " + JSON.stringify(moderatorQuery))

    if(moderatorQuery === undefined && depositorQuery === undefined) {
      return undefined;
    }
    else {

      const query =
        {
          "bool": {
            "must": [
              {
                "term": {
                  "versionState": "RELEASED"
                }
              },
              {
                bool: {
                  should: [
                    ...depositorQuery ? [depositorQuery] : [],
                    ...moderatorQuery ? [moderatorQuery] : []
                  ]
                }
              }
            ]
          }
        }

      return query;
    }

  }




}
