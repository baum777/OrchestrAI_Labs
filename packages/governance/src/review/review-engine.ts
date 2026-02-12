export class ReviewEngine {
  review(actionId: string, policyId: string): boolean {
    console.log(`Reviewing ${actionId} against policy ${policyId}`);
    return true;
  }
}

