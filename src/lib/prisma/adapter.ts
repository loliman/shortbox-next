import type {
  AdminTaskResult,
  Appearance,
  Arc,
  ChangeRequest,
  Cover,
  CoverIndividual,
  Individual,
  Issue,
  IssueArc,
  IssueIndividual,
  Prisma,
  Publisher,
  SearchIndex,
  Series,
  Session,
  Story,
  StoryAppearance,
  StoryIndividual,
  User
} from "@prisma/client";
import { prisma } from "./client";

type DelegateWithCrud<
  TFindUniqueArgs,
  TFindManyArgs,
  TCreateArgs,
  TUpdateArgs,
  TDeleteArgs,
  TUpsertArgs,
  TCountArgs,
  TResult
> = {
  findUnique(args: TFindUniqueArgs): Promise<TResult | null>;
  findMany(args?: TFindManyArgs): Promise<TResult[]>;
  create(args: TCreateArgs): Promise<TResult>;
  update(args: TUpdateArgs): Promise<TResult>;
  delete(args: TDeleteArgs): Promise<TResult>;
  upsert(args: TUpsertArgs): Promise<TResult>;
  count(args?: TCountArgs): Promise<number>;
};

export class PrismaCrudAdapter<
  TFindUniqueArgs extends { where: object },
  TFindManyArgs extends object,
  TCreateArgs extends object,
  TUpdateArgs extends { where: object },
  TDeleteArgs extends { where: object },
  TUpsertArgs extends { where: object },
  TCountArgs extends object,
  TResult
> {
  constructor(
    private readonly delegate: DelegateWithCrud<
      TFindUniqueArgs,
      TFindManyArgs,
      TCreateArgs,
      TUpdateArgs,
      TDeleteArgs,
      TUpsertArgs,
      TCountArgs,
      TResult
    >
  ) {}

  findUnique(args: TFindUniqueArgs) {
    return this.delegate.findUnique(args);
  }

  findMany(args?: TFindManyArgs) {
    return this.delegate.findMany(args);
  }

  create(args: TCreateArgs) {
    return this.delegate.create(args);
  }

  update(args: TUpdateArgs) {
    return this.delegate.update(args);
  }

  delete(args: TDeleteArgs) {
    return this.delegate.delete(args);
  }

  upsert(args: TUpsertArgs) {
    return this.delegate.upsert(args);
  }

  count(args?: TCountArgs) {
    return this.delegate.count(args);
  }

  async exists(where: TFindUniqueArgs["where"]) {
    const record = await this.delegate.findUnique({ where } as TFindUniqueArgs);
    return record !== null;
  }
}

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export function createShortboxAdapters(client: PrismaExecutor = prisma) {
  return {
    users: new PrismaCrudAdapter<
      Prisma.UserFindUniqueArgs,
      Prisma.UserFindManyArgs,
      Prisma.UserCreateArgs,
      Prisma.UserUpdateArgs,
      Prisma.UserDeleteArgs,
      Prisma.UserUpsertArgs,
      Prisma.UserCountArgs,
      User
    >(client.user),
    storyAppearances: new PrismaCrudAdapter<
      Prisma.StoryAppearanceFindUniqueArgs,
      Prisma.StoryAppearanceFindManyArgs,
      Prisma.StoryAppearanceCreateArgs,
      Prisma.StoryAppearanceUpdateArgs,
      Prisma.StoryAppearanceDeleteArgs,
      Prisma.StoryAppearanceUpsertArgs,
      Prisma.StoryAppearanceCountArgs,
      StoryAppearance
    >(client.storyAppearance),
    storyIndividuals: new PrismaCrudAdapter<
      Prisma.StoryIndividualFindUniqueArgs,
      Prisma.StoryIndividualFindManyArgs,
      Prisma.StoryIndividualCreateArgs,
      Prisma.StoryIndividualUpdateArgs,
      Prisma.StoryIndividualDeleteArgs,
      Prisma.StoryIndividualUpsertArgs,
      Prisma.StoryIndividualCountArgs,
      StoryIndividual
    >(client.storyIndividual),
    changeRequests: new PrismaCrudAdapter<
      Prisma.ChangeRequestFindUniqueArgs,
      Prisma.ChangeRequestFindManyArgs,
      Prisma.ChangeRequestCreateArgs,
      Prisma.ChangeRequestUpdateArgs,
      Prisma.ChangeRequestDeleteArgs,
      Prisma.ChangeRequestUpsertArgs,
      Prisma.ChangeRequestCountArgs,
      ChangeRequest
    >(client.changeRequest),
    series: new PrismaCrudAdapter<
      Prisma.SeriesFindUniqueArgs,
      Prisma.SeriesFindManyArgs,
      Prisma.SeriesCreateArgs,
      Prisma.SeriesUpdateArgs,
      Prisma.SeriesDeleteArgs,
      Prisma.SeriesUpsertArgs,
      Prisma.SeriesCountArgs,
      Series
    >(client.series),
    stories: new PrismaCrudAdapter<
      Prisma.StoryFindUniqueArgs,
      Prisma.StoryFindManyArgs,
      Prisma.StoryCreateArgs,
      Prisma.StoryUpdateArgs,
      Prisma.StoryDeleteArgs,
      Prisma.StoryUpsertArgs,
      Prisma.StoryCountArgs,
      Story
    >(client.story),
    adminTaskResults: new PrismaCrudAdapter<
      Prisma.AdminTaskResultFindUniqueArgs,
      Prisma.AdminTaskResultFindManyArgs,
      Prisma.AdminTaskResultCreateArgs,
      Prisma.AdminTaskResultUpdateArgs,
      Prisma.AdminTaskResultDeleteArgs,
      Prisma.AdminTaskResultUpsertArgs,
      Prisma.AdminTaskResultCountArgs,
      AdminTaskResult
    >(client.adminTaskResult),
    issues: new PrismaCrudAdapter<
      Prisma.IssueFindUniqueArgs,
      Prisma.IssueFindManyArgs,
      Prisma.IssueCreateArgs,
      Prisma.IssueUpdateArgs,
      Prisma.IssueDeleteArgs,
      Prisma.IssueUpsertArgs,
      Prisma.IssueCountArgs,
      Issue
    >(client.issue),
    issueArcs: new PrismaCrudAdapter<
      Prisma.IssueArcFindUniqueArgs,
      Prisma.IssueArcFindManyArgs,
      Prisma.IssueArcCreateArgs,
      Prisma.IssueArcUpdateArgs,
      Prisma.IssueArcDeleteArgs,
      Prisma.IssueArcUpsertArgs,
      Prisma.IssueArcCountArgs,
      IssueArc
    >(client.issueArc),
    issueIndividuals: new PrismaCrudAdapter<
      Prisma.IssueIndividualFindUniqueArgs,
      Prisma.IssueIndividualFindManyArgs,
      Prisma.IssueIndividualCreateArgs,
      Prisma.IssueIndividualUpdateArgs,
      Prisma.IssueIndividualDeleteArgs,
      Prisma.IssueIndividualUpsertArgs,
      Prisma.IssueIndividualCountArgs,
      IssueIndividual
    >(client.issueIndividual),
    publishers: new PrismaCrudAdapter<
      Prisma.PublisherFindUniqueArgs,
      Prisma.PublisherFindManyArgs,
      Prisma.PublisherCreateArgs,
      Prisma.PublisherUpdateArgs,
      Prisma.PublisherDeleteArgs,
      Prisma.PublisherUpsertArgs,
      Prisma.PublisherCountArgs,
      Publisher
    >(client.publisher),
    sessions: new PrismaCrudAdapter<
      Prisma.SessionFindUniqueArgs,
      Prisma.SessionFindManyArgs,
      Prisma.SessionCreateArgs,
      Prisma.SessionUpdateArgs,
      Prisma.SessionDeleteArgs,
      Prisma.SessionUpsertArgs,
      Prisma.SessionCountArgs,
      Session
    >(client.session),
    searchIndex: new PrismaCrudAdapter<
      Prisma.SearchIndexFindUniqueArgs,
      Prisma.SearchIndexFindManyArgs,
      Prisma.SearchIndexCreateArgs,
      Prisma.SearchIndexUpdateArgs,
      Prisma.SearchIndexDeleteArgs,
      Prisma.SearchIndexUpsertArgs,
      Prisma.SearchIndexCountArgs,
      SearchIndex
    >(client.searchIndex),
    appearances: new PrismaCrudAdapter<
      Prisma.AppearanceFindUniqueArgs,
      Prisma.AppearanceFindManyArgs,
      Prisma.AppearanceCreateArgs,
      Prisma.AppearanceUpdateArgs,
      Prisma.AppearanceDeleteArgs,
      Prisma.AppearanceUpsertArgs,
      Prisma.AppearanceCountArgs,
      Appearance
    >(client.appearance),
    arcs: new PrismaCrudAdapter<
      Prisma.ArcFindUniqueArgs,
      Prisma.ArcFindManyArgs,
      Prisma.ArcCreateArgs,
      Prisma.ArcUpdateArgs,
      Prisma.ArcDeleteArgs,
      Prisma.ArcUpsertArgs,
      Prisma.ArcCountArgs,
      Arc
    >(client.arc),
    covers: new PrismaCrudAdapter<
      Prisma.CoverFindUniqueArgs,
      Prisma.CoverFindManyArgs,
      Prisma.CoverCreateArgs,
      Prisma.CoverUpdateArgs,
      Prisma.CoverDeleteArgs,
      Prisma.CoverUpsertArgs,
      Prisma.CoverCountArgs,
      Cover
    >(client.cover),
    coverIndividuals: new PrismaCrudAdapter<
      Prisma.CoverIndividualFindUniqueArgs,
      Prisma.CoverIndividualFindManyArgs,
      Prisma.CoverIndividualCreateArgs,
      Prisma.CoverIndividualUpdateArgs,
      Prisma.CoverIndividualDeleteArgs,
      Prisma.CoverIndividualUpsertArgs,
      Prisma.CoverIndividualCountArgs,
      CoverIndividual
    >(client.coverIndividual),
    individuals: new PrismaCrudAdapter<
      Prisma.IndividualFindUniqueArgs,
      Prisma.IndividualFindManyArgs,
      Prisma.IndividualCreateArgs,
      Prisma.IndividualUpdateArgs,
      Prisma.IndividualDeleteArgs,
      Prisma.IndividualUpsertArgs,
      Prisma.IndividualCountArgs,
      Individual
    >(client.individual)
  };
}

export type ShortboxAdapters = ReturnType<typeof createShortboxAdapters>;
