
# Azure Boards Estimate

Enhance your sprint planning sessions with the Planning Poker for Azure DevOps extension. This powerful tool allows you to streamline the estimation process by enabling your team to collaboratively estimate the effort of work items directly within Azure DevOps. Select work items from your iteration, query, or backlog, conduct effective estimation sessions with your team, and seamlessly update the work items in real-time. Improve accuracy and team alignment on effort estimates, ensuring better planning and execution of your projects.


# Documentation 

For detailed instructions on using the Planning Poker for Azure DevOps extension, please refer to the official documentation. You can access the comprehensive guide by clicking [Market place](https://marketplace.visualstudio.com/items?itemName=ms-devlabs.estimate). This resource provides step-by-step information to help you effectively utilize the estimation features within your Azure DevOps environment.




### Developing and Testing

<span style="color: green">To test your work, first [follow these steps to set up a DevOps marketplace publisher account](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=azure-devops) (if you already have an account move on).

1. Run `npm run package-dev` and upload the package as a private extension to your  Azure DevOps publisher account
> Note: You may need to add a directory called `build` to the project root when running the script. The output of the `package-dev` script is there.
 - Be sure to update the `manifest.json` to use your publisher's ID before running the script.
2. Install the private extension on your Azure DevOps oragnization and test your changes.

# Support

## How to file issues and get help

This project uses [GitHub Issues](https://github.com/microsoft/azure-boards-estimate/issues) to track bugs and feature requests. Please search the existing issues before filing new issues to avoid duplicates. For new issues, file your bug or feature request as a new Issue. 


## Contributing

We welcome contributions to improve the the Planning Poker for Azure DevOps extension. If you would like to contribute, please fork the repository and create a pull request with your changes. Your contributions help enhance the functionality and usability of the extension for the entire community.

## Microsoft DevLabs
Microsoft DevLabs is an outlet for experiments from Microsoft, experiments that represent some of the latest ideas around developer tools. Solutions in this category are designed for broad usage, and you are encouraged to use and provide feedback on them; however, these extensions are not supported nor are any commitments made as to their longevity.